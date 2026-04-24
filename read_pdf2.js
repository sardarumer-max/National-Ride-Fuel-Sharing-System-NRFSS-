const pdfParse = require('pdf-parse');
const fs = require('fs');

const buf = fs.readFileSync('./prompt.pdf');
pdfParse(buf).then(data => {
  console.log(data.text);
  fs.writeFileSync('./pdf_content.txt', data.text, 'utf8');
}).catch(err => {
  console.error('Error:', err.message);
});
