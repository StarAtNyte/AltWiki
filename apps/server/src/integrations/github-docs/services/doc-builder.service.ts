import { Injectable, Logger } from '@nestjs/common';
import { PageService } from '../../../core/page/services/page.service';
import { GeneratedDoc, RepoMetadata } from '../dto/generate-docs.dto';
import { Page, InsertablePage } from '@docmost/db/types/entity.types';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { markdownToHtml } from '@docmost/editor-ext';
import {
  htmlToJson,
  jsonToText,
  tiptapExtensions,
} from '../../../collaboration/collaboration.util';
import { TiptapTransformer } from '@hocuspocus/transformer';
import * as Y from 'yjs';
import { generateSlugId } from '../../../common/helpers';
import { v7 as uuid7 } from 'uuid';

@Injectable()
export class DocBuilderService {
  private readonly logger = new Logger(DocBuilderService.name);

  constructor(
    private readonly pageService: PageService,
    @InjectKysely() private readonly db: KyselyDB,
  ) {}

  async createDocPages(
    docs: GeneratedDoc[],
    metadata: RepoMetadata,
    spaceId: string,
    workspaceId: string,
    userId: string,
  ): Promise<Page[]> {
    const createdPages: Page[] = [];

    // Get the next position for root pages in the space
    const rootPosition = await this.pageService.nextPagePosition(spaceId);

    // Create single page with all content and linked table of contents
    const fullContent = this.buildFullPageContent(metadata, docs);
    const page = await this.createPageWithContent({
      title: `${metadata.repo} Documentation`,
      icon: null,
      markdownContent: fullContent,
      spaceId,
      workspaceId,
      userId,
      parentPageId: null,
      position: rootPosition,
    });

    createdPages.push(page);
    this.logger.log(`Created documentation page: ${page.id}`);

    return createdPages;
  }

  private async createPageWithContent(params: {
    title: string;
    icon: string | null;
    markdownContent: string;
    spaceId: string;
    workspaceId: string;
    userId: string;
    parentPageId: string | null;
    position: string;
  }): Promise<Page> {
    const {
      title,
      icon,
      markdownContent,
      spaceId,
      workspaceId,
      userId,
      parentPageId,
      position,
    } = params;

    // Convert markdown to HTML, then to ProseMirror JSON
    const html = await markdownToHtml(markdownContent);
    const prosemirrorJson = htmlToJson(html);
    const textContent = jsonToText(prosemirrorJson);
    const ydoc = await this.createYdoc(prosemirrorJson);

    const pageId = uuid7();
    const slugId = generateSlugId();

    const insertablePage: InsertablePage = {
      id: pageId,
      slugId,
      title,
      icon,
      content: prosemirrorJson,
      textContent,
      ydoc,
      position,
      spaceId,
      workspaceId,
      creatorId: userId,
      lastUpdatedById: userId,
      parentPageId,
    };

    await this.db.insertInto('pages').values(insertablePage).execute();

    return this.db
      .selectFrom('pages')
      .selectAll()
      .where('id', '=', pageId)
      .executeTakeFirst() as Promise<Page>;
  }

  private async createYdoc(prosemirrorJson: object): Promise<Buffer> {
    const ydoc = TiptapTransformer.toYdoc(prosemirrorJson, 'default', tiptapExtensions);
    return Buffer.from(Y.encodeStateAsUpdate(ydoc));
  }

  private buildFullPageContent(metadata: RepoMetadata, docs: GeneratedDoc[]): string {
    // Helper to create slug from title
    const slugify = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    let content = `# ${metadata.repo}

${metadata.description || 'Documentation generated from GitHub repository.'}

## Repository Info

| Property | Value |
|----------|-------|
| **Owner** | ${metadata.owner} |
| **Language** | ${metadata.language || 'N/A'} |
| **Stars** | ${metadata.stars.toLocaleString()} |
| **Forks** | ${metadata.forks.toLocaleString()} |
| **License** | ${metadata.license || 'Not specified'} |

## Table of Contents

`;

    // Build table of contents with anchor links
    for (const doc of docs) {
      const slug = slugify(doc.title);
      content += `- [${doc.title}](#${slug})\n`;
    }

    content += '\n---\n\n';

    // Add all documentation sections
    for (const doc of docs) {
      const slug = slugify(doc.title);
      content += `<a id="${slug}"></a>\n\n`;
      content += `## ${doc.title}\n\n`;
      content += `${doc.content}\n\n`;
      content += '---\n\n';
    }

    content += `> **Note:** This documentation was auto-generated from the [GitHub repository](https://github.com/${metadata.owner}/${metadata.repo}).\n`;

    return content;
  }

}
