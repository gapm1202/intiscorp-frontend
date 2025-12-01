const http = require('http');
const fs = require('fs');

const boundary = '----node-multipart-' + Date.now();
const payloadObj = { html: '<!doctype html><html><body><h1>Prueba desde test-post</h1><p>Si ves esto, el servidor respondió.</p></body></html>' };
const field = `--${boundary}\r\nContent-Disposition: form-data; name="data"\r\n\r\n${JSON.stringify(payloadObj)}\r\n`;
const end = `--${boundary}--\r\n`;
const body = Buffer.concat([Buffer.from(field, 'utf8'), Buffer.from(end, 'utf8')]);

const options = {
  hostname: 'localhost',
  port: 4001,
  path: '/api/informes',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': body.length
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  const out = fs.createWriteStream(__dirname + '/test-informe.pdf');
  res.pipe(out);
  res.on('end', () => console.log('Response ended. Saved to test-informe.pdf'));
});

req.on('error', (e) => {
  console.error('Request error', e && e.message);
});

req.write(body);
req.end();
