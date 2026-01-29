import * as mime from 'mime-types';
import * as path from 'node:path';

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath);
  return mime.contentType(ext) || 'application/octet-stream';
}

/**
 * Gets the file extension from a MIME type.
 * Returns the extension with a leading dot (e.g., '.png', '.pdf').
 * Returns empty string if no extension can be determined.
 */
export function getExtensionFromMimeType(mimeType: string): string {
  if (!mimeType || mimeType === 'application/octet-stream') {
    return '';
  }
  const ext = mime.extension(mimeType);
  return ext ? `.${ext}` : '';
}
