const fs = require('fs');
const path = require('path');

// Try to use pdf-parse if available, otherwise use basic extraction
try {
  const pdfParse = require('pdf-parse');
  const buf = fs.readFileSync('C:/Users/Umar/Desktop/APP/prompt.pdf');
  pdfParse(buf).then(data => {
    console.log('=== PDF TEXT EXTRACTED ===');
    console.log(data.text);
    fs.writeFileSync('C:/Users/Umar/Desktop/APP/pdf_content.txt', data.text);
    console.log('\n=== Saved to pdf_content.txt ===');
  }).catch(err => {
    console.error('pdf-parse error:', err.message);
  });
} catch(e) {
  console.log('pdf-parse not installed, trying basic extraction...');
  const buf = fs.readFileSync('C:/Users/Umar/Desktop/APP/prompt.pdf');
  const raw = buf.toString('binary');
  // Extract strings between parentheses (PDF text operators)
  const matches = raw.match(/\(([^\)\\]{3,})\)/g);
  if (matches) {
    const text = matches.map(m => m.slice(1,-1)).join(' ');
    console.log(text);
    fs.writeFileSync('C:/Users/Umar/Desktop/APP/pdf_content.txt', text);
  }
}
