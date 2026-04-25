const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs');

async function extractText() {
  const data = new Uint8Array(fs.readFileSync('./prompt.pdf'));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  let fullText = '';

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  console.log(fullText);
  fs.writeFileSync('./pdf_content.txt', fullText, 'utf8');
  console.log('\n=== Saved to pdf_content.txt ===');
}

extractText().catch(err => console.error('Error:', err.message));
