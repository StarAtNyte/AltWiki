import { Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { load } from 'cheerio';

export interface ConfluenceAttachment {
  id: string;
  fileName: string;
  mimeType: string;
}

export interface ConfluencePage {
  id: string;
  title: string;
  parentPageId: string | null;
  position: number;
  content: string; // Raw Confluence Storage Format
  attachments: ConfluenceAttachment[];
}

export interface ConfluenceSpaceInfo {
  id: string;
  name: string;
  key: string;
  homePageId: string | null;
  description?: string;
}

export interface ConfluenceParseResult {
  pages: Map<string, ConfluencePage>;
  titleToPageId: Map<string, string>;
  spaceInfo: ConfluenceSpaceInfo | null;
}

const logger = new Logger('ConfluenceParser');

/**
 * Parses a Confluence Space Export entities.xml file to extract pages,
 * hierarchy, and attachments.
 */
export async function parseConfluenceExport(
  extractDir: string,
): Promise<ConfluenceParseResult> {
  const entitiesPath = path.join(extractDir, 'entities.xml');

  let xmlContent: string;
  try {
    xmlContent = await fs.readFile(entitiesPath, 'utf-8');
  } catch (err) {
    logger.error(`Failed to read entities.xml at ${entitiesPath}`, err);
    throw new Error(
      `Confluence export must contain an entities.xml file: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const $ = load(xmlContent, { xml: true });

  const pages = new Map<string, ConfluencePage>();
  const titleToPageId = new Map<string, string>();
  let spaceInfo: ConfluenceSpaceInfo | null = null;

  // Map from attachment ID to attachment metadata
  const attachmentMap = new Map<
    string,
    { fileName: string; mimeType: string; pageId: string }
  >();

  // Map from BodyContent ID to body content (HTML)
  // BodyContent objects are stored separately from Page objects
  const bodyContentMap = new Map<string, string>();

  // Parse Space object to get space info
  $('object[class="Space"]').each((_, el) => {
    const $obj = $(el);
    const id = getPropertyValue($, $obj, 'id');
    const name = getPropertyValue($, $obj, 'name');
    const key = getPropertyValue($, $obj, 'key');
    const homePageId = getIdPropertyValue($, $obj, 'homePage');

    if (id && name) {
      spaceInfo = {
        id,
        name,
        key: key || '',
        homePageId,
      };
    }
  });

  logger.debug(`Found Confluence space: ${spaceInfo?.name} (${spaceInfo?.key})`);

  // First pass: collect all BodyContent objects
  // These are stored separately and referenced by ID from Page objects
  $('object[class="BodyContent"]').each((_, el) => {
    const $obj = $(el);
    const id = getPropertyValue($, $obj, 'id');
    const body = getPropertyValue($, $obj, 'body');
    const bodyType = getPropertyValue($, $obj, 'bodyType');

    // bodyType 2 = storage format (XHTML), which is what we want
    // bodyType 1 = other formats (e.g., "full-width" layout hints)
    if (id && body && bodyType === '2') {
      bodyContentMap.set(id, body);
    }
  });

  logger.debug(`Found ${bodyContentMap.size} BodyContent objects with storage format`);

  // Second pass: collect all attachments
  $('object[class="Attachment"]').each((_, el) => {
    const $obj = $(el);
    const id = getPropertyValue($, $obj, 'id');
    const title = getPropertyValue($, $obj, 'title');
    const contentType = getPropertyValue($, $obj, 'contentType');

    // Get the container (page) ID - attachments are associated with pages
    const containerId = getIdPropertyValue($, $obj, 'containerContent');

    if (id && title) {
      attachmentMap.set(id, {
        fileName: title,
        mimeType: contentType || 'application/octet-stream',
        pageId: containerId || '',
      });
    }
  });

  // Third pass: collect all pages
  $('object[class="Page"]').each((_, el) => {
    const $obj = $(el);

    const id = getPropertyValue($, $obj, 'id');
    const title = getPropertyValue($, $obj, 'title') || 'Untitled';
    const position = parseInt(getPropertyValue($, $obj, 'position') || '0', 10);
    const contentStatus = getPropertyValue($, $obj, 'contentStatus');

    // Skip non-current pages (drafts, historical versions, etc.)
    if (contentStatus && contentStatus !== 'current') {
      return;
    }

    // Skip historical versions - they have an originalVersion property
    const originalVersion = getIdPropertyValue($, $obj, 'originalVersion');
    if (originalVersion) {
      return;
    }

    // Get parent page ID
    const parentPageId = getIdPropertyValue($, $obj, 'parent');

    // Get body content by looking up the BodyContent ID reference
    let content = '';
    const bodyContentElement = $obj
      .find('collection[name="bodyContents"] element[class="BodyContent"]')
      .first();

    if (bodyContentElement.length) {
      // Get the ID of the referenced BodyContent
      const bodyContentId = bodyContentElement.find('id').first().text().trim();
      if (bodyContentId && bodyContentMap.has(bodyContentId)) {
        content = bodyContentMap.get(bodyContentId) || '';
      }
    }

    // Collect attachments for this page
    const pageAttachments: ConfluenceAttachment[] = [];
    $obj.find('collection[name="attachments"] element').each((_, attEl) => {
      const $att = $(attEl);
      const attId = $att.find('id').first().text();
      const attInfo = attachmentMap.get(attId);
      if (attInfo) {
        pageAttachments.push({
          id: attId,
          fileName: attInfo.fileName,
          mimeType: attInfo.mimeType,
        });
      }
    });

    // Also add attachments that reference this page as container
    attachmentMap.forEach((attInfo, attId) => {
      if (
        attInfo.pageId === id &&
        !pageAttachments.some((a) => a.id === attId)
      ) {
        pageAttachments.push({
          id: attId,
          fileName: attInfo.fileName,
          mimeType: attInfo.mimeType,
        });
      }
    });

    if (id) {
      const page: ConfluencePage = {
        id,
        title,
        parentPageId,
        position,
        content,
        attachments: pageAttachments,
      };

      pages.set(id, page);
      titleToPageId.set(title, id);
    }
  });

  logger.debug(
    `Parsed ${pages.size} pages and ${attachmentMap.size} attachments from Confluence export`,
  );

  return { pages, titleToPageId, spaceInfo };
}

/**
 * Gets a property value from a Confluence object element.
 * Handles both direct text content and nested id elements.
 */
function getPropertyValue(
  $: ReturnType<typeof load>,
  $obj: ReturnType<ReturnType<typeof load>>,
  propertyName: string,
): string | null {
  // Try to find as direct property first
  const $prop = $obj.find(`> property[name="${propertyName}"]`).first();
  if ($prop.length) {
    return $prop.text().trim() || null;
  }

  // Try to find as id element
  const $id = $obj.find(`> id[name="${propertyName}"]`).first();
  if ($id.length) {
    return $id.text().trim() || null;
  }

  return null;
}

/**
 * Gets an ID reference from a property that contains an <id> element.
 * Used for relationships like parentPage.
 */
function getIdPropertyValue(
  $: ReturnType<typeof load>,
  $obj: ReturnType<ReturnType<typeof load>>,
  propertyName: string,
): string | null {
  const $prop = $obj.find(`> property[name="${propertyName}"]`).first();
  if ($prop.length) {
    const $id = $prop.find('id').first();
    if ($id.length) {
      return $id.text().trim() || null;
    }
  }
  return null;
}

/**
 * Builds attachment candidates map from the Confluence export's attachments directory.
 * Format: attachments/{pageId}/{attachmentId}.{ext} or attachments/{pageId}/{version}/{attachmentId}
 */
export async function buildConfluenceAttachmentCandidates(
  extractDir: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const attachmentsDir = path.join(extractDir, 'attachments');

  try {
    await fs.access(attachmentsDir);
  } catch {
    // No attachments directory
    return map;
  }

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        const relPath = path.relative(extractDir, fullPath).split(path.sep).join('/');
        map.set(relPath, fullPath);
      }
    }
  }

  await walk(attachmentsDir);
  return map;
}
