import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { v7 } from 'uuid';
import { generateJitteredKeyBetween } from 'fractional-indexing-jittered';
import { FileTask, InsertablePage } from '@docmost/db/types/entity.types';
import { generateSlugId } from '../../../common/helpers';
import { jsonToText } from '../../../collaboration/collaboration.util';
import { getProsemirrorContent } from '../../../common/helpers/prosemirror/utils';
import { formatImportHtml } from '../utils/import-formatter';
import { executeTx } from '@docmost/db/utils';
import { BacklinkRepo } from '@docmost/db/repos/backlink/backlink.repo';
import { ImportAttachmentService } from './import-attachment.service';
import { ImportService } from './import.service';
import { PageService } from '../../../core/page/services/page.service';
import { ImportPageNode } from '../dto/file-task-dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventName } from '../../../common/events/event.contants';
import {
  parseConfluenceExport,
  buildConfluenceAttachmentCandidates,
  ConfluencePage,
} from '../utils/confluence-parser';
import {
  convertConfluenceContent,
  resolveConfluenceLinks,
} from '../utils/confluence-formatter';

interface AttachmentInfo {
  href: string;
  fileName: string;
  mimeType: string;
}

@Injectable()
export class ConfluenceImportService {
  private readonly logger = new Logger(ConfluenceImportService.name);

  constructor(
    private readonly importService: ImportService,
    private readonly pageService: PageService,
    private readonly backlinkRepo: BacklinkRepo,
    @InjectKysely() private readonly db: KyselyDB,
    private readonly importAttachmentService: ImportAttachmentService,
    private eventEmitter: EventEmitter2,
  ) {}

  async processConfluenceImport(opts: {
    extractDir: string;
    fileTask: FileTask;
  }): Promise<void> {
    const { extractDir, fileTask } = opts;

    // Step 1: Parse entities.xml
    const { pages: confluencePages, titleToPageId } =
      await parseConfluenceExport(extractDir);

    if (confluencePages.size === 0) {
      this.logger.warn('No pages found in Confluence export');
      return;
    }

    // Step 2: Build attachment candidates
    const attachmentCandidates =
      await buildConfluenceAttachmentCandidates(extractDir);

    // Step 3: Create ImportPageNode map with new UUIDs
    const pagesMap = new Map<string, ImportPageNode>();
    const confluenceIdToNewId = new Map<string, string>();
    const titleToNewPageMeta = new Map<
      string,
      { id: string; slugId: string; title: string }
    >();

    for (const [confId, confPage] of confluencePages) {
      const newId = v7();
      const slugId = generateSlugId();

      confluenceIdToNewId.set(confId, newId);

      pagesMap.set(confId, {
        id: newId,
        slugId,
        name: confPage.title,
        content: confPage.content,
        parentPageId: null, // Will be set in next step
        fileExtension: '.html',
        filePath: confId, // Use Confluence ID as file path for tracking
        position: undefined,
      });

      titleToNewPageMeta.set(confPage.title, {
        id: newId,
        slugId,
        title: confPage.title,
      });
    }

    // Step 4: Map Confluence parent IDs to new page IDs for hierarchy
    for (const [confId, confPage] of confluencePages) {
      const pageNode = pagesMap.get(confId)!;
      if (confPage.parentPageId) {
        const newParentId = confluenceIdToNewId.get(confPage.parentPageId);
        if (newParentId) {
          pageNode.parentPageId = newParentId;
        }
      }
    }

    // Step 5: Generate position keys
    const siblingsMap = new Map<string | null, ImportPageNode[]>();

    pagesMap.forEach((page) => {
      const group = siblingsMap.get(page.parentPageId) ?? [];
      group.push(page);
      siblingsMap.set(page.parentPageId, group);
    });

    // Sort by Confluence position, then by title
    siblingsMap.forEach((siblings) => {
      siblings.sort((a, b) => {
        const confA = confluencePages.get(a.filePath);
        const confB = confluencePages.get(b.filePath);
        const posA = confA?.position ?? 0;
        const posB = confB?.position ?? 0;
        if (posA !== posB) return posA - posB;
        return a.name.localeCompare(b.name);
      });
    });

    // Get root pages
    const rootSibs = siblingsMap.get(null);

    if (rootSibs?.length) {
      const nextPosition = await this.pageService.nextPagePosition(
        fileTask.spaceId,
      );

      let prevPos: string | null = null;
      rootSibs.forEach((page, idx) => {
        if (idx === 0) {
          page.position = nextPosition;
        } else {
          page.position = generateJitteredKeyBetween(prevPos, null);
        }
        prevPos = page.position!;
      });
    }

    // Non-root pages
    siblingsMap.forEach((sibs, parentId) => {
      if (parentId === null) return;

      let prevPos: string | null = null;
      for (const page of sibs) {
        page.position = generateJitteredKeyBetween(prevPos, null);
        prevPos = page.position!;
      }
    });

    // Step 6: Build filePathToPageMetaMap for internal link resolution
    const filePathToPageMetaMap = new Map<
      string,
      { id: string; title: string; slugId: string }
    >();
    pagesMap.forEach((page) => {
      filePathToPageMetaMap.set(page.filePath, {
        id: page.id,
        title: page.name,
        slugId: page.slugId,
      });
    });

    // Group pages by level for topological processing
    const pagesByLevel = new Map<number, Array<[string, ImportPageNode]>>();
    const pageLevel = new Map<string, number>();

    // Calculate levels using BFS
    const calculateLevels = () => {
      const queue: Array<{ confId: string; level: number }> = [];

      // Start with root pages
      for (const [confId, page] of pagesMap.entries()) {
        if (!page.parentPageId) {
          queue.push({ confId, level: 0 });
          pageLevel.set(confId, 0);
        }
      }

      // BFS to assign levels
      while (queue.length > 0) {
        const { confId, level } = queue.shift()!;
        const currentPage = pagesMap.get(confId)!;

        // Find children
        for (const [childConfId, childPage] of pagesMap.entries()) {
          if (
            childPage.parentPageId === currentPage.id &&
            !pageLevel.has(childConfId)
          ) {
            pageLevel.set(childConfId, level + 1);
            queue.push({ confId: childConfId, level: level + 1 });
          }
        }
      }

      // Group by level
      for (const [confId, page] of pagesMap.entries()) {
        const level = pageLevel.get(confId) || 0;
        if (!pagesByLevel.has(level)) {
          pagesByLevel.set(level, []);
        }
        pagesByLevel.get(level)!.push([confId, page]);
      }
    };

    calculateLevels();

    // Step 7: Process pages level by level
    const allBacklinks: any[] = [];
    const validPageIds = new Set<string>();
    let totalPagesProcessed = 0;

    const sortedLevels = Array.from(pagesByLevel.keys()).sort((a, b) => a - b);

    try {
      await executeTx(this.db, async (trx) => {
        for (const level of sortedLevels) {
          const levelPages = pagesByLevel.get(level)!;

          for (const [confId, page] of levelPages) {
            const confPage = confluencePages.get(confId)!;

            // Convert Confluence content to HTML
            let htmlContent = convertConfluenceContent(
              confPage.content,
              confId,
              titleToPageId,
            );

            // Build attachment info for this page
            const pageAttachments: AttachmentInfo[] = [];
            for (const att of confPage.attachments) {
              // Find the actual file path in attachments directory
              for (const [relPath, absPath] of attachmentCandidates.entries()) {
                const fileName = path.basename(relPath);
                // Match by attachment ID or filename
                if (
                  relPath.includes(`/${att.id}`) ||
                  relPath.includes(`/${att.id}.`) ||
                  fileName === att.fileName
                ) {
                  pageAttachments.push({
                    href: relPath,
                    fileName: att.fileName,
                    mimeType: att.mimeType,
                  });
                  break;
                }
              }
            }

            // Build attachment path map for resolving links
            const attachmentPathMap = new Map<string, string>();
            for (const att of pageAttachments) {
              attachmentPathMap.set(att.fileName, att.href);
            }

            // Resolve Confluence-specific links
            htmlContent = resolveConfluenceLinks(
              htmlContent,
              confId,
              titleToNewPageMeta,
              attachmentPathMap,
            );

            // Process attachments
            const processedHtml =
              await this.importAttachmentService.processAttachments({
                html: htmlContent,
                pageRelativePath: confId,
                extractDir,
                pageId: page.id,
                fileTask,
                attachmentCandidates,
                pageAttachments,
                isConfluenceImport: true,
              });

            // Format HTML and resolve internal links
            const { html, backlinks, pageIcon } = await formatImportHtml({
              html: processedHtml,
              currentFilePath: page.filePath,
              filePathToPageMetaMap,
              creatorId: fileTask.creatorId,
              sourcePageId: page.id,
              workspaceId: fileTask.workspaceId,
            });

            // Convert to ProseMirror
            const pmState = getProsemirrorContent(
              await this.importService.processHTML(html),
            );

            const { title, prosemirrorJson } =
              this.importService.extractTitleAndRemoveHeading(pmState);

            const insertablePage: InsertablePage = {
              id: page.id,
              slugId: page.slugId,
              title: title || page.name,
              icon: pageIcon || null,
              content: prosemirrorJson,
              textContent: jsonToText(prosemirrorJson),
              ydoc: await this.importService.createYdoc(prosemirrorJson),
              position: page.position!,
              spaceId: fileTask.spaceId,
              workspaceId: fileTask.workspaceId,
              creatorId: fileTask.creatorId,
              lastUpdatedById: fileTask.creatorId,
              parentPageId: page.parentPageId,
            };

            await trx.insertInto('pages').values(insertablePage).execute();

            validPageIds.add(insertablePage.id);
            allBacklinks.push(...backlinks);
            totalPagesProcessed++;

            if (totalPagesProcessed % 50 === 0) {
              this.logger.debug(`Processed ${totalPagesProcessed} pages...`);
            }
          }
        }

        // Filter and insert backlinks
        const filteredBacklinks = allBacklinks.filter(
          ({ sourcePageId, targetPageId }) =>
            validPageIds.has(sourcePageId) && validPageIds.has(targetPageId),
        );

        if (filteredBacklinks.length > 0) {
          const BACKLINK_BATCH_SIZE = 100;
          for (
            let i = 0;
            i < filteredBacklinks.length;
            i += BACKLINK_BATCH_SIZE
          ) {
            const backlinkChunk = filteredBacklinks.slice(
              i,
              Math.min(i + BACKLINK_BATCH_SIZE, filteredBacklinks.length),
            );
            await this.backlinkRepo.insertBacklink(backlinkChunk, trx);
          }
        }

        if (validPageIds.size > 0) {
          this.eventEmitter.emit(EventName.PAGE_CREATED, {
            pageIds: Array.from(validPageIds),
            workspaceId: fileTask.workspaceId,
          });
        }

        this.logger.log(
          `Successfully imported ${totalPagesProcessed} Confluence pages with ${filteredBacklinks.length} backlinks`,
        );
      });
    } catch (error) {
      this.logger.error('Failed to import Confluence export:', error);
      throw new Error(`Confluence import failed: ${error?.['message']}`);
    }
  }
}
