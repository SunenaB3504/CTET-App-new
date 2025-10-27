const http = require('http');
const fs = require('fs');
const path = require('path');
const port = process.env.PORT || 8000;
const root = path.resolve(__dirname, '../../');

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if(reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(root, reqPath);
  // prevent path traversal
  if(!filePath.startsWith(root)){
    res.statusCode = 403; res.end('Forbidden'); return;
  }
  fs.stat(filePath, (err, stats) => {
    if(err){ res.statusCode = 404; res.end('Not found'); return; }
    if(stats.isDirectory()){
      const idx = path.join(filePath, 'index.html');
      if(fs.existsSync(idx)){
        serveFile(idx, res); return;
      }
      res.statusCode = 404; res.end('Not found'); return;
    }
    serveFile(filePath, res);
  });
});

function serveFile(fp, res){
  const ext = path.extname(fp).toLowerCase();
  const ct = mime[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', ct);
  const stream = fs.createReadStream(fp);
  stream.on('error', ()=>{ res.statusCode=500; res.end('Server error'); });
  stream.pipe(res);
}

server.listen(port, '127.0.0.1', ()=>{
  console.log('Dev static server listening on http://127.0.0.1:'+port);
});

process.on('SIGINT', ()=> process.exit(0));
