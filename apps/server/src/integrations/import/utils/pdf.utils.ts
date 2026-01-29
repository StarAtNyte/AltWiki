import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { promises as fs } from 'fs';

export async function extractTextFromPdf(filePath: string): Promise<string> {
    try {
        const data = await fs.readFile(filePath);
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
