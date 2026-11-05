import { Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { load } from 'cheerio';
import * as mime from 'mime-types';

export interface ConfluenceAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  /** Attachment version; in XML exports the file on disk is named after it. */
  version?: string;
}

/**
 * Resolves the MIME type of a Confluence attachment. XML exports keep it in a
 * MEDIA_TYPE ContentProperty (older exports used a contentType property);
 * fall back to the title's extension.
 */
export function resolveConfluenceMimeType(
  fileName: string,
  declared?: string | null,
): string {
  if (declared && declared !== 'application/octet-stream') {
    return declared;
  }
  return (fileName && mime.lookup(fileName)) || 'application/octet-stream';
}

/**
 * Matches the attachments declared for a page against the files present in
 * the export. XML exports store files as
 * attachments/{pageId}/{attachmentId}/{version}; HTML exports use
 * attachments/{pageId}/{attachmentId}.{ext}. Path segments are compared
 * exactly so that one id never matches a longer id that starts with it.
 */
export function matchConfluencePageAttachments(
  attachments: ConfluenceAttachment[],
  attachmentCandidates: Map<string, string>,
): { href: string; fileName: string; mimeType: string }[] {
  const result: { href: string; fileName: string; mimeType: string }[] = [];
  const relPaths = Array.from(attachmentCandidates.keys());

  for (const att of attachments) {
    const matches = relPaths.filter((relPath) => {
      const segments = relPath.split('/');
      const last = segments[segments.length - 1];
      return (
        segments.slice(0, -1).includes(att.id) ||
        last === att.id ||
        last.startsWith(`${att.id}.`)
      );
    });

    let href: string | undefined;
    if (matches.length > 0) {
      // Prefer the exact version, otherwise the highest numeric version.
      href =
        matches.find((m) => att.version && m.endsWith(`/${att.id}/${att.version}`)) ??
        matches.sort((a, b) => {
          const va = parseInt(a.split('/').pop() || '', 10) || 0;
          const vb = parseInt(b.split('/').pop() || '', 10) || 0;
          return vb - va;
        })[0];
    } else {
      href = relPaths.find((relPath) => path.basename(relPath) === att.fileName);
    }

    if (href) {
      result.push({
        href,
        fileName: att.fileName,
        mimeType: resolveConfluenceMimeType(att.fileName, att.mimeType),
      });
    }
  }

  return result;
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
 * Confluence exports nest CDATA sections: the outer CDATA wraps the body
 * property, and inner CDATA sections wrap code macro content. To avoid
 * prematurely closing the outer CDATA, Confluence writes the inner closing
 * token as "]] >" (with a space). When the body string is later parsed as
 * standalone XHTML, that broken closer never terminates the inner CDATA,
 * causing all subsequent text to be consumed as part of the code block.
 * This function normalizes those sequences back to proper "]]>" closers.
 */
function normalizeConfluenceCdata(body: string): string {
  return body.replace(
    /\]\]\s+>(\s*<\/ac:(?:plain-text-body|rich-text-body)\s*>)/gi,
    ']]>$1',
  );
}

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
    { fileName: string; mimeType: string; pageId: string; version: string }
  >();

  // Map from ContentProperty ID to its name/value. Attachments reference
  // these for MEDIA_TYPE (the real MIME type) in XML exports.
  const contentPropertyMap = new Map<string, { name: string; value: string }>();

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
      bodyContentMap.set(id, normalizeConfluenceCdata(body));
    }
  });

  logger.debug(`Found ${bodyContentMap.size} BodyContent objects with storage format`);

  $('object[class="ContentProperty"]').each((_, el) => {
    const $obj = $(el);
    const id = getPropertyValue($, $obj, 'id');
    const name = getPropertyValue($, $obj, 'name');
    if (id && name) {
      contentPropertyMap.set(id, {
        name,
        value: getPropertyValue($, $obj, 'stringValue') || '',
      });
    }
  });

  // Second pass: collect all attachments
  $('object[class="Attachment"]').each((_, el) => {
    const $obj = $(el);
    const id = getPropertyValue($, $obj, 'id');
    const title = getPropertyValue($, $obj, 'title');

    // Skip historical versions; their data lives under the current
    // attachment's folder.
    if (getIdPropertyValue($, $obj, 'originalVersion')) {
      return;
    }
    const contentStatus = getPropertyValue($, $obj, 'contentStatus');
    if (contentStatus && contentStatus !== 'current') {
      return;
    }

    let contentType = getPropertyValue($, $obj, 'contentType');
    if (!contentType) {
      $obj
        .find('> collection[name="contentProperties"] > element > id')
        .each((_, idEl) => {
          const prop = contentPropertyMap.get($(idEl).text().trim());
          if (prop?.name === 'MEDIA_TYPE' && prop.value) {
            contentType = prop.value;
          }
        });
    }

    // Get the container (page) ID - attachments are associated with pages
    const containerId = getIdPropertyValue($, $obj, 'containerContent');

    if (id && title) {
      attachmentMap.set(id, {
        fileName: title,
        mimeType: resolveConfluenceMimeType(title, contentType),
        pageId: containerId || '',
        version: getPropertyValue($, $obj, 'version') || '',
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
          version: attInfo.version,
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
          version: attInfo.version,
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
