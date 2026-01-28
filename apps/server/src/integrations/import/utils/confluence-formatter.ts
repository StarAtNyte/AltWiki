import { load, CheerioAPI, Cheerio } from 'cheerio';
import { Logger } from '@nestjs/common';

const logger = new Logger('ConfluenceFormatter');

// Emoticon name to unicode emoji mapping
const EMOTICON_MAP: Record<string, string> = {
  smile: '\u{1F642}',
  sad: '\u{1F641}',
  cheeky: '\u{1F61B}',
  laugh: '\u{1F604}',
  wink: '\u{1F609}',
  thumbs_up: '\u{1F44D}',
  thumbs_down: '\u{1F44E}',
  information: '\u{2139}',
  tick: '\u{2714}',
  cross: '\u{274C}',
  warning: '\u{26A0}',
  plus: '\u{2795}',
  minus: '\u{2796}',
  question: '\u{2753}',
  light_on: '\u{1F4A1}',
  light_off: '\u{1F4A1}',
  yellow_star: '\u{2B50}',
  red_star: '\u{2B50}',
  green_star: '\u{2B50}',
  blue_star: '\u{2B50}',
  heart: '\u{2764}',
  broken_heart: '\u{1F494}',
};

/**
 * Converts Confluence Storage Format (XHTML with ac:* macros) to standard HTML
 * that Docmost's editor can understand.
 */
export function convertConfluenceContent(
  content: string,
  pageId: string,
  titleToPageId: Map<string, string>,
): string {
  if (!content || !content.trim()) {
    return '';
  }

  // Wrap content to ensure proper parsing
  const wrappedContent = `<div>${content}</div>`;
  const $: CheerioAPI = load(wrappedContent, { xml: true });

  // Process macros in order
  processCodeMacros($);
  processCalloutMacros($);
  processExpandMacros($);
  processTableOfContents($);
  processPageLinks($, titleToPageId);
  processAttachmentImages($, pageId);
  processAttachmentLinks($, pageId);
  processEmoticons($);
  processTaskLists($);
  processStatusMacros($);
  processPanelMacros($);
  processNoFormatMacros($);
  processLayoutMacros($);

  // Get the inner content without the wrapper div
  const result = $('div').first().html() || '';

  return result;
}

/**
 * Process ac:structured-macro with name="code"
 */
function processCodeMacros($: CheerioAPI): void {
  $('ac\\:structured-macro[ac\\:name="code"]').each((_, el) => {
    const $macro = $(el);

    // Get language from parameters
    let language = '';
    $macro.find('ac\\:parameter[ac\\:name="language"]').each((_, param) => {
      language = $(param).text().trim();
    });

    // Get title if present
    let title = '';
    $macro.find('ac\\:parameter[ac\\:name="title"]').each((_, param) => {
      title = $(param).text().trim();
    });

    // Get the plain text body
    const codeContent =
      $macro.find('ac\\:plain-text-body').text() ||
      $macro.find('ac\\:rich-text-body').text();

    // Create code block
    const $pre = $('<pre>');
    const $code = $('<code>');
    if (language) {
      $code.addClass(`language-${language.toLowerCase()}`);
    }
    $code.text(codeContent);
    $pre.append($code);

    $macro.replaceWith($pre);
  });
}

/**
 * Process callout macros (info, warning, note, tip)
 */
function processCalloutMacros($: CheerioAPI): void {
  const calloutTypes: Record<string, string> = {
    info: 'info',
    warning: 'warning',
    note: 'info',
    tip: 'success',
    error: 'danger',
  };

  for (const [macroName, calloutType] of Object.entries(calloutTypes)) {
    $(`ac\\:structured-macro[ac\\:name="${macroName}"]`).each((_, el) => {
      const $macro = $(el);

      // Get rich text body content
      const $body = $macro.find('ac\\:rich-text-body');
      const bodyHtml = $body.html() || '';

      // Create callout div
      const $callout = $('<div>')
        .attr('data-type', 'callout')
        .attr('data-callout-type', calloutType);

      // Parse and append the body content
      const bodyContent = load(bodyHtml, { xml: true });
      $callout.append(bodyContent.root().children());

      $macro.replaceWith($callout);
    });
  }
}

/**
 * Process panel macros
 */
function processPanelMacros($: CheerioAPI): void {
  $('ac\\:structured-macro[ac\\:name="panel"]').each((_, el) => {
    const $macro = $(el);

    // Get rich text body content
    const $body = $macro.find('ac\\:rich-text-body');
    const bodyHtml = $body.html() || '';

    // Create callout div (panels become callouts)
    const $callout = $('<div>')
      .attr('data-type', 'callout')
      .attr('data-callout-type', 'info');

    const bodyContent = load(bodyHtml, { xml: true });
    $callout.append(bodyContent.root().children());

    $macro.replaceWith($callout);
  });
}

/**
 * Process expand/collapse macros
 */
function processExpandMacros($: CheerioAPI): void {
  $('ac\\:structured-macro[ac\\:name="expand"]').each((_, el) => {
    const $macro = $(el);

    // Get title parameter
    let title = 'Click to expand...';
    $macro.find('ac\\:parameter[ac\\:name="title"]').each((_, param) => {
      title = $(param).text().trim() || title;
    });

    // Get rich text body content
    const $body = $macro.find('ac\\:rich-text-body');
    const bodyHtml = $body.html() || '';

    // Create details/summary structure
    const $details = $('<details>');
    const $summary = $('<summary>').text(title);
    $details.append($summary);

    const bodyContent = load(bodyHtml, { xml: true });
    $details.append(bodyContent.root().children());

    $macro.replaceWith($details);
  });
}

/**
 * Remove table of contents macros (not needed in Docmost)
 */
function processTableOfContents($: CheerioAPI): void {
  $('ac\\:structured-macro[ac\\:name="toc"]').remove();
  $('ac\\:structured-macro[ac\\:name="toc-zone"]').each((_, el) => {
    const $macro = $(el);
    const $body = $macro.find('ac\\:rich-text-body');
    const bodyHtml = $body.html() || '';

    const bodyContent = load(bodyHtml, { xml: true });
    $macro.replaceWith(bodyContent.root().children());
  });
}

/**
 * Process internal page links: ac:link with ri:page
 */
function processPageLinks(
  $: CheerioAPI,
  titleToPageId: Map<string, string>,
): void {
  $('ac\\:link').each((_, el) => {
    const $link = $(el);

    // Check for page reference
    const $pageRef = $link.find('ri\\:page');
    if ($pageRef.length) {
      const pageTitle = $pageRef.attr('ri:content-title') || '';

      // Get link text
      let linkText =
        $link.find('ac\\:link-body').text() ||
        $link.find('ac\\:plain-text-link-body').text() ||
        pageTitle;

      if (!linkText) {
        linkText = pageTitle;
      }

      // Create placeholder link for later resolution
      // Format: confluence-page:{title}
      const $anchor = $('<a>')
        .attr('href', `confluence-page:${pageTitle}`)
        .text(linkText);

      $link.replaceWith($anchor);
      return;
    }

    // Check for attachment reference
    const $attachmentRef = $link.find('ri\\:attachment');
    if ($attachmentRef.length) {
      const fileName = $attachmentRef.attr('ri:filename') || '';
      const linkText =
        $link.find('ac\\:link-body').text() ||
        $link.find('ac\\:plain-text-link-body').text() ||
        fileName;

      const $anchor = $('<a>')
        .attr('href', `confluence-attachment:${fileName}`)
        .attr('data-linked-resource-default-alias', fileName)
        .text(linkText);

      $link.replaceWith($anchor);
      return;
    }

    // Check for URL reference
    const $urlRef = $link.find('ri\\:url');
    if ($urlRef.length) {
      const url = $urlRef.attr('ri:value') || '';
      const linkText =
        $link.find('ac\\:link-body').text() ||
        $link.find('ac\\:plain-text-link-body').text() ||
        url;

      const $anchor = $('<a>').attr('href', url).text(linkText);

      $link.replaceWith($anchor);
      return;
    }

    // Check for user reference
    const $userRef = $link.find('ri\\:user');
    if ($userRef.length) {
      const username = $userRef.attr('ri:username') || '';
      const linkText =
        $link.find('ac\\:link-body').text() ||
        $link.find('ac\\:plain-text-link-body').text() ||
        `@${username}`;

      const $span = $('<span>').text(linkText);
      $link.replaceWith($span);
      return;
    }

    // Fallback: just extract text content
    const text = $link.text();
    $link.replaceWith(text);
  });
}

/**
 * Process attachment images: ac:image with ri:attachment
 */
function processAttachmentImages($: CheerioAPI, pageId: string): void {
  $('ac\\:image').each((_, el) => {
    const $image = $(el);

    const $attachmentRef = $image.find('ri\\:attachment');
    if ($attachmentRef.length) {
      const fileName = $attachmentRef.attr('ri:filename') || '';

      // Create img element with placeholder path
      // Will be resolved during attachment processing
      const $img = $('<img>')
        .attr('src', `confluence-attachment:${fileName}`)
        .attr('alt', fileName);

      // Preserve width/height if specified
      const width = $image.attr('ac:width');
      const height = $image.attr('ac:height');
      if (width) $img.attr('width', width);
      if (height) $img.attr('height', height);

      $image.replaceWith($img);
      return;
    }

    // Check for URL reference
    const $urlRef = $image.find('ri\\:url');
    if ($urlRef.length) {
      const url = $urlRef.attr('ri:value') || '';
      const $img = $('<img>').attr('src', url);

      const width = $image.attr('ac:width');
      const height = $image.attr('ac:height');
      if (width) $img.attr('width', width);
      if (height) $img.attr('height', height);

      $image.replaceWith($img);
    }
  });
}

/**
 * Process attachment links
 */
function processAttachmentLinks($: CheerioAPI, pageId: string): void {
  // Handle direct ri:attachment elements that are not inside ac:link or ac:image
  $('ri\\:attachment')
    .filter((_, el) => {
      const $el = $(el);
      return !$el.parent('ac\\:link').length && !$el.parent('ac\\:image').length;
    })
    .each((_, el) => {
      const $attachment = $(el);
      const fileName = $attachment.attr('ri:filename') || '';

      const $anchor = $('<a>')
        .attr('href', `confluence-attachment:${fileName}`)
        .attr('data-linked-resource-default-alias', fileName)
        .text(fileName);

      $attachment.replaceWith($anchor);
    });
}

/**
 * Process emoticons
 */
function processEmoticons($: CheerioAPI): void {
  $('ac\\:emoticon').each((_, el) => {
    const $emoticon = $(el);
    const name = $emoticon.attr('ac:name') || '';

    const emoji = EMOTICON_MAP[name] || '\u{1F642}'; // Default to smile
    $emoticon.replaceWith(emoji);
  });
}

/**
 * Process task lists
 */
function processTaskLists($: CheerioAPI): void {
  $('ac\\:task-list').each((_, el) => {
    const $taskList = $(el);

    const $ul = $('<ul>').attr('data-type', 'taskList');

    $taskList.find('ac\\:task').each((_, taskEl) => {
      const $task = $(taskEl);

      const status = $task.find('ac\\:task-status').text().trim();
      const isChecked = status === 'complete';
      const bodyHtml = $task.find('ac\\:task-body').html() || '';

      const $li = $('<li>')
        .attr('data-type', 'taskItem')
        .attr('data-checked', String(isChecked));

      const $label = $('<label>');
      const $input = $('<input>').attr('type', 'checkbox');
      if (isChecked) $input.attr('checked', '');
      $label.append($input);
      $label.append($('<span>'));

      const $container = $('<div>');
      const bodyContent = load(bodyHtml, { xml: true });
      $container.append(bodyContent.root().children());

      $li.append($label);
      $li.append($container);
      $ul.append($li);
    });

    $taskList.replaceWith($ul);
  });
}

/**
 * Process status macros
 */
function processStatusMacros($: CheerioAPI): void {
  $('ac\\:structured-macro[ac\\:name="status"]').each((_, el) => {
    const $macro = $(el);

    let title = '';
    $macro.find('ac\\:parameter[ac\\:name="title"]').each((_, param) => {
      title = $(param).text().trim();
    });

    // Convert status to a styled span
    const $span = $('<span>')
      .attr('data-type', 'status')
      .text(title || 'Status');

    $macro.replaceWith($span);
  });
}

/**
 * Process noformat macros (preformatted text)
 */
function processNoFormatMacros($: CheerioAPI): void {
  $('ac\\:structured-macro[ac\\:name="noformat"]').each((_, el) => {
    const $macro = $(el);

    const content =
      $macro.find('ac\\:plain-text-body').text() ||
      $macro.find('ac\\:rich-text-body').text();

    const $pre = $('<pre>');
    const $code = $('<code>').text(content);
    $pre.append($code);

    $macro.replaceWith($pre);
  });
}

/**
 * Process layout macros - extract content and flatten
 */
function processLayoutMacros($: CheerioAPI): void {
  // Process layout sections
  $('ac\\:layout-section').each((_, el) => {
    const $section = $(el);
    const $cells = $section.find('ac\\:layout-cell');

    const $wrapper = $('<div>');
    $cells.each((_, cellEl) => {
      const $cell = $(cellEl);
      const cellHtml = $cell.html() || '';
      const cellContent = load(cellHtml, { xml: true });
      $wrapper.append(cellContent.root().children());
    });

    $section.replaceWith($wrapper.children());
  });

  // Process standalone layout elements
  $('ac\\:layout').each((_, el) => {
    const $layout = $(el);
    const layoutHtml = $layout.html() || '';
    const layoutContent = load(layoutHtml, { xml: true });
    $layout.replaceWith(layoutContent.root().children());
  });
}

/**
 * Resolves confluence-page: and confluence-attachment: placeholder links
 * to actual page mentions and attachment paths.
 */
export function resolveConfluenceLinks(
  html: string,
  pageId: string,
  titleToNewPageId: Map<string, { id: string; slugId: string }>,
  attachmentPathMap: Map<string, string>,
): string {
  const $ = load(html);

  // Resolve page links
  $('a[href^="confluence-page:"]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    const pageTitle = href.replace('confluence-page:', '');
    const pageMeta = titleToNewPageId.get(pageTitle);

    if (pageMeta) {
      // Will be converted to mention later by formatImportHtml
      $a.attr('href', `page:${pageMeta.id}`);
    } else {
      // Page not found, convert to plain text
      $a.replaceWith($a.text());
    }
  });

  // Resolve attachment links
  $('a[href^="confluence-attachment:"]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    const fileName = href.replace('confluence-attachment:', '');

    // Try to find attachment path
    let resolvedPath: string | null = null;
    for (const [key, value] of attachmentPathMap.entries()) {
      if (key.endsWith(`/${fileName}`) || key === fileName) {
        resolvedPath = key;
        break;
      }
    }

    if (resolvedPath) {
      $a.attr('href', resolvedPath);
    }
  });

  // Resolve attachment images
  $('img[src^="confluence-attachment:"]').each((_, el) => {
    const $img = $(el);
    const src = $img.attr('src') || '';
    const fileName = src.replace('confluence-attachment:', '');

    // Try to find attachment path
    let resolvedPath: string | null = null;
    for (const [key, value] of attachmentPathMap.entries()) {
      if (key.endsWith(`/${fileName}`) || key === fileName) {
        resolvedPath = key;
        break;
      }
    }

    if (resolvedPath) {
      $img.attr('src', resolvedPath);
    }
  });

  return $.html();
}
