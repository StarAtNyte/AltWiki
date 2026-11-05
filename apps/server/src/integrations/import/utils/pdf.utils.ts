import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { promises as fs } from 'fs';

export async function extractTextFromPdf(filePath: string): Promise<string> {
    return extractTextFromPdfBuffer(await fs.readFile(filePath));
}

// AltWiki: basic text-only PDF -> HTML (used when the EE PDF importer is absent)
export async function extractTextFromPdfBuffer(
    buffer: Buffer | Uint8Array,
): Promise<string> {
    try {
        const data = new Uint8Array(buffer);
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;

        const textParts: string[] = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            const pageText = textContent.items
                .map((item: any) => {
                    if ('str' in item) {
                        return item.str;
                    }
                    return '';
                })
                .join(' ');

            if (pageText.trim()) {
                textParts.push(`<h2>Page ${pageNum}</h2>`);
                // Convert text to paragraphs (split by double newlines or long text blocks)
                const paragraphs = pageText
                    .split(/\n\n+/)
                    .filter((p) => p.trim().length > 0)
                    .map((p) => `<p>${p.trim()}</p>`)
                    .join('\n');
                textParts.push(paragraphs);
            }
        }

        return textParts.join('\n');
    } catch (error: any) {
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
}
