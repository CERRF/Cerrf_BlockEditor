const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const banned_command = ['python', 'python3', 'bash', 'powershell', 'cmd', 'git', 'scp', 'ftp', 'telnet', 'nc', 'ncat', 'perl', 'ruby', 'php', 'java', 'node', 'npm'];

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, '/public/index.html'), 'utf-8', (err, data) => {
      if (err) {
        res.statusCode = 500;
        return res.end('Error loading index.html');
      }
      const clientIP = req.socket.remoteAddress.replace(/^::ffff:/, '');
      const updatedData = data.replace(/{{clientIP}}/g, clientIP);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(updatedData);
    });
  } else if (req.url.startsWith('/public/') && req.method === 'GET') {
    const filePath = path.join(__dirname, req.url);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        return res.end('File not found');
      }
      const ext = path.extname(filePath);
      let contentType = 'text/plain';
      if (ext === '.html') contentType = 'text/html';
      else if (ext === '.css') contentType = 'text/css';
      else if (ext === '.js') contentType = 'application/javascript';
      else if (ext === '.json') contentType = 'application/json';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  } else if (req.url === '/run' && req.method === 'POST') {
    let requestBody = '';
    req.on('data', chunk => { requestBody += chunk.toString(); });
    
    req.on('end', () => {
      console.log('Received command:', requestBody);
      if (banned_command.some(cmd => requestBody.includes(cmd))) {
        res.end("Unauthorized command.");
        return;
      }
      const clientIP = req.socket.remoteAddress.replace(/^::ffff:/, '');
      const clientDir = path.join(__dirname, 'client_folders', clientIP);
      fs.mkdir(clientDir, { recursive: true, mode: 0o700 }, (err) => {
        if (err) {
          console.error('Error creating client folder:', err);
          res.statusCode = 500;
          return res.end('Error establishing your workspace.');
        }
        console.log(`Client folder ${clientDir} created (or exists).`);
        const child = spawn(requestBody, { shell: true, cwd: clientDir });
        let outputBuffer = '';
        child.stdout.on('data', (data) => {
          outputBuffer += data.toString();
        });
        child.stderr.on('data', (data) => {
          outputBuffer += data.toString();
        });
        child.on('close', (code) => {
          console.log('Command finished with code:', code);
          res.end(outputBuffer);
        });
      });
    });
  } else if (req.url === '/files' && req.method === 'GET') {
    // Serve the list of files in the user's folder
    const clientIP = req.socket.remoteAddress.replace(/^::ffff:/, '');
    const clientDir = path.join(__dirname, 'client_folders', clientIP);

    fs.readdir(clientDir, (err, files) => {
      if (err) {
        console.error('Error reading user folder:', err);
        res.statusCode = 500;
        return res.end(JSON.stringify([])); // Return an empty array on error
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(files));
    });
  } else if (req.url === '/workshops' && req.method === 'GET') {
    // List all workshop files in the "public/workshops" folder.
    const workshopsDir = path.join(__dirname, '/public/workshops');
    fs.readdir(workshopsDir, (err, files) => {
      if (err) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: "Could not read workshops directory" }));
      }
      // Filter workshop files by extension (e.g., .cerrf)
      const workshopFiles = files.filter(f => f.endsWith('.cerrf'));
      // Build a list with file name and a URL (assuming files are served via /public/workshops)
      const workshops = workshopFiles.map(file => ({
        name: file,
        url: `/public/workshops/${file}`
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(workshops));
    });
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(3000, () => {
  console.log('Server is listening on port 3000');
});