import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import * as path from 'path';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { v7 } from 'uuid';
import { generateJitteredKeyBetween } from 'fractional-indexing-jittered';
import { FileTask, InsertablePage, User } from '@docmost/db/types/entity.types';
import { generateSlugId } from '../../../common/helpers';
import { jsonToText } from '../../../collaboration/collaboration.util';
import { getProsemirrorContent } from '../../../common/helpers/prosemirror/utils';
import { formatImportHtml } from '../utils/import-formatter';
import { executeTx } from '@docmost/db/utils';
import { BacklinkRepo } from '@docmost/db/repos/backlink/backlink.repo';
import { ImportAttachmentService } from './import-attachment.service';
import { ImportService } from './import.service';
import { PageService } from '../../../core/page/services/page.service';
import { SpaceService } from '../../../core/space/services/space.service';
import { ImportPageNode } from '../dto/file-task-dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventName } from '../../../common/events/event.contants';
import {
  parseConfluenceExport,
  buildConfluenceAttachmentCandidates,
  ConfluencePage,
  ConfluenceSpaceInfo,
} from '../utils/confluence-parser';
import {
  convertConfluenceContent,
  resolveConfluenceLinks,
} from '../utils/confluence-formatter';
import { SpaceRole, UserRole } from '../../../common/helpers/types/permission';
import { SpaceMemberService } from '../../../core/space/services/space-member.service';

interface AttachmentInfo {
  href: string;
  fileName: string;
  mimeType: string;
}

@Injectable()
export class ConfluenceImportService {
  private readonly logger = new Logger(ConfluenceImportService.name);

  constructor(
    @Inject(forwardRef(() => ImportService))
    private readonly importService: ImportService,
    private readonly pageService: PageService,
    private readonly spaceService: SpaceService,
    private readonly spaceMemberService: SpaceMemberService,
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

  /**
   * Import a Confluence export as a new Docmost space.
   * The Confluence space becomes a Docmost space, and pages are imported
   * with the home page's children becoming root-level pages.
   */
  async processConfluenceSpaceImport(opts: {
    extractDir: string;
    user: User;
    workspaceId: string;
  }): Promise<{ spaceId: string; spaceName: string; pageCount: number }> {
    const { extractDir, user, workspaceId } = opts;

    // Step 1: Parse entities.xml
    const { pages: confluencePages, titleToPageId, spaceInfo } =
      await parseConfluenceExport(extractDir);

    if (!spaceInfo) {
      throw new Error('No space information found in Confluence export');
    }

    if (confluencePages.size === 0) {
      this.logger.warn('No pages found in Confluence export');
      throw new Error('No pages found in Confluence export');
    }

    // Step 2: Create a new Docmost space
    const baseSlug = this.generateSpaceSlug(spaceInfo.key || spaceInfo.name);
    const uniqueSlug = await this.generateUniqueSpaceSlug(baseSlug, workspaceId);
    const space = await this.spaceService.createSpace(user, workspaceId, {
      name: spaceInfo.name,
      slug: uniqueSlug,
      description: spaceInfo.description,
    });

    this.logger.log(
      `Created space "${space.name}" (${space.slug}) for Confluence import`,
    );

    // Step 2b: Add workspace owners and admins to the space
    await this.addWorkspaceOwnersToSpace(space.id, user.id, workspaceId);

    // Step 3: Build attachment candidates
    const attachmentCandidates =
      await buildConfluenceAttachmentCandidates(extractDir);

    // Step 4: Create ImportPageNode map with new UUIDs
    // Skip the home page - its children become root-level pages
    const pagesMap = new Map<string, ImportPageNode>();
    const confluenceIdToNewId = new Map<string, string>();
    const titleToNewPageMeta = new Map<
      string,
      { id: string; slugId: string; title: string }
    >();

    for (const [confId, confPage] of confluencePages) {
      // Skip the home page itself
      if (confId === spaceInfo.homePageId) {
        continue;
      }

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
        filePath: confId,
        position: undefined,
      });

      titleToNewPageMeta.set(confPage.title, {
        id: newId,
        slugId,
        title: confPage.title,
      });
    }

    // Step 5: Map Confluence parent IDs to new page IDs for hierarchy
    // Pages whose parent is the home page become root-level (parentPageId = null)
    for (const [confId, confPage] of confluencePages) {
      if (confId === spaceInfo.homePageId) continue;

      const pageNode = pagesMap.get(confId)!;
      if (confPage.parentPageId) {
        // If parent is the home page, this becomes a root-level page
        if (confPage.parentPageId === spaceInfo.homePageId) {
          pageNode.parentPageId = null;
        } else {
          const newParentId = confluenceIdToNewId.get(confPage.parentPageId);
          if (newParentId) {
            pageNode.parentPageId = newParentId;
          }
        }
      }
    }

    // Step 6: Generate position keys
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

    // Root pages
    const rootSibs = siblingsMap.get(null);
    if (rootSibs?.length) {
      let prevPos: string | null = null;
      rootSibs.forEach((page) => {
        page.position = generateJitteredKeyBetween(prevPos, null);
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

    // Step 7: Build filePathToPageMetaMap for internal link resolution
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

    const calculateLevels = () => {
      const queue: Array<{ confId: string; level: number }> = [];

      for (const [confId, page] of pagesMap.entries()) {
        if (!page.parentPageId) {
          queue.push({ confId, level: 0 });
          pageLevel.set(confId, 0);
        }
      }

      while (queue.length > 0) {
        const { confId, level } = queue.shift()!;
        const currentPage = pagesMap.get(confId)!;

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

      for (const [confId, page] of pagesMap.entries()) {
        const level = pageLevel.get(confId) || 0;
        if (!pagesByLevel.has(level)) {
          pagesByLevel.set(level, []);
        }
        pagesByLevel.get(level)!.push([confId, page]);
      }
    };

    calculateLevels();

    // Step 8: Process pages level by level
    const allBacklinks: any[] = [];
    const validPageIds = new Set<string>();
    let totalPagesProcessed = 0;

    const sortedLevels = Array.from(pagesByLevel.keys()).sort((a, b) => a - b);

    // Create a mock fileTask for attachment processing
    const mockFileTask = {
      id: v7(),
      spaceId: space.id,
      workspaceId: workspaceId,
      creatorId: user.id,
    } as FileTask;

    try {
      await executeTx(this.db, async (trx) => {
        for (const level of sortedLevels) {
          const levelPages = pagesByLevel.get(level)!;

          for (const [confId, page] of levelPages) {
            const confPage = confluencePages.get(confId)!;

            let htmlContent = convertConfluenceContent(
              confPage.content,
              confId,
              titleToPageId,
            );

            // Build attachment info for this page
            const pageAttachments: AttachmentInfo[] = [];
            for (const att of confPage.attachments) {
              for (const [relPath, absPath] of attachmentCandidates.entries()) {
                const fileName = path.basename(relPath);
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

            const attachmentPathMap = new Map<string, string>();
            for (const att of pageAttachments) {
              attachmentPathMap.set(att.fileName, att.href);
            }

            htmlContent = resolveConfluenceLinks(
              htmlContent,
              confId,
              titleToNewPageMeta,
              attachmentPathMap,
            );

            const processedHtml =
              await this.importAttachmentService.processAttachments({
                html: htmlContent,
                pageRelativePath: confId,
                extractDir,
                pageId: page.id,
                fileTask: mockFileTask,
                attachmentCandidates,
                pageAttachments,
                isConfluenceImport: true,
              });

            const { html, backlinks, pageIcon } = await formatImportHtml({
              html: processedHtml,
              currentFilePath: page.filePath,
              filePathToPageMetaMap,
              creatorId: user.id,
              sourcePageId: page.id,
              workspaceId: workspaceId,
            });

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
              spaceId: space.id,
              workspaceId: workspaceId,
              creatorId: user.id,
              lastUpdatedById: user.id,
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
            workspaceId: workspaceId,
          });
        }

        this.logger.log(
          `Successfully imported ${totalPagesProcessed} Confluence pages into space "${space.name}" with ${filteredBacklinks.length} backlinks`,
        );
      });
    } catch (error) {
      this.logger.error('Failed to import Confluence space:', error);
      throw new Error(`Confluence space import failed: ${error?.['message']}`);
    }

    return {
      spaceId: space.id,
      spaceName: space.name,
      pageCount: totalPagesProcessed,
    };
  }

  /**
   * Generate a URL-friendly slug from a space key or name
   */
  private generateSpaceSlug(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) || 'imported-space';
  }

  /**
   * Generate a unique space slug by appending a number suffix if needed.
   * If 'my-space' exists, tries 'my-space-1', 'my-space-2', etc.
   */
  private async generateUniqueSpaceSlug(
    baseSlug: string,
    workspaceId: string,
  ): Promise<string> {
    let slug = baseSlug;
    let suffix = 0;
    const maxAttempts = 100;

    while (suffix < maxAttempts) {
      const exists = await this.slugExists(slug, workspaceId);
      if (!exists) {
        return slug;
      }
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }

    // Fallback: append timestamp if all numbered suffixes are taken
    return `${baseSlug}-${Date.now()}`;
  }

  /**
   * Check if a space slug exists in the workspace
   */
  private async slugExists(
    slug: string,
    workspaceId: string,
  ): Promise<boolean> {
    const { count } = await this.db
      .selectFrom('spaces')
      .select((eb) => eb.fn.count('id').as('count'))
      .where('workspaceId', '=', workspaceId)
      .where((eb) =>
        eb(eb.fn('lower', ['slug']), '=', slug.toLowerCase()),
      )
      .executeTakeFirst();

    return Number(count) > 0;
  }

  /**
   * Add all workspace owners and admins to a space as space admins.
   * This ensures workspace administrators can see and manage imported spaces.
   */
  private async addWorkspaceOwnersToSpace(
    spaceId: string,
    creatorId: string,
    workspaceId: string,
  ): Promise<void> {
    // Get all workspace owners and admins (excluding the creator who is already added)
    const workspaceAdmins = await this.db
      .selectFrom('users')
      .select(['id'])
      .where('workspaceId', '=', workspaceId)
      .where('role', 'in', [UserRole.OWNER, UserRole.ADMIN])
      .where('id', '!=', creatorId)
      .where('deletedAt', 'is', null)
      .execute();

    // Add each admin to the space
    for (const admin of workspaceAdmins) {
      try {
        await this.spaceMemberService.addUserToSpace(
          admin.id,
          spaceId,
          SpaceRole.ADMIN,
          workspaceId,
        );
      } catch (error) {
        // Ignore if user is already a member (shouldn't happen but be safe)
        this.logger.debug(
          `Could not add workspace admin ${admin.id} to space: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (workspaceAdmins.length > 0) {
      this.logger.debug(
        `Added ${workspaceAdmins.length} workspace owners/admins to space ${spaceId}`,
      );
    }
  }
}
