const pdf = require('pdf-parse/lib/pdf-parse.js');
const fs = require('fs');

const buf = fs.readFileSync('./prompt.pdf');
pdf(buf).then(data => {
  console.log(data.text);
  fs.writeFileSync('./pdf_content.txt', data.text, 'utf8');
  console.log('\n\n=== Saved to pdf_content.txt ===');
}).catch(err => {
  console.error('Error:', err.message);
});
