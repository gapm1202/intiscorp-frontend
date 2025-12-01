const http = require('http');
const port = 4001;
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type':'text/plain'});
  res.end('ok');
});
server.listen(port, () => console.log('test-listen: server listening on', port));
server.on('error', (e) => { console.error('test-listen error', e && e.message); process.exit(1); });
setInterval(()=>{}, 1000);
