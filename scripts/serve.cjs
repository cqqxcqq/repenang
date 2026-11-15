'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.argv[2] || 8000);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Choose a port between 1024 and 65535.');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.pdf':'application/pdf'};
const server = http.createServer((request, response) => {
  if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
  let file;
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    if (file === root) file = path.join(root, 'index.html');
    const relative = path.relative(root, file);
    if (relative.split(path.sep).some((part) => part.startsWith('.')) || !types[path.extname(file)]) { response.writeHead(404).end(); return; }
  } catch { response.writeHead(400).end(); return; }
  fs.readFile(file, (error, body) => {
    if (error) { response.writeHead(404).end('Not found'); return; }
    response.setHeader('Content-Type', types[path.extname(file)]);
    response.setHeader('Cache-Control', 'no-cache');
    response.end(request.method === 'HEAD' ? undefined : body);
  });
});
server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Pulang: http://127.0.0.1:${port}/ (Ctrl+C to stop)`));
