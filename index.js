const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const banned_command = ['python', 'python3', 'bash', 'powershell', 'cmd', 'git', 'scp', 'ftp', 'telnet', 'nc', 'ncat', 'perl', 'ruby', 'php', 'java', 'node', 'npm'];
let clientIP = ''; // To store the client's IP address

const server = http.createServer((req, res) => {
  if (req.url === '/' && req.method === 'GET') {
    fs.readFile(path.join(__dirname, '/public/index.html'), 'utf-8', (err, data) => {
      if (err) {
        res.statusCode = 500;
        return res.end('Error loading index.html');
      }
      clientIP = req.socket.remoteAddress; // get client's IP address
      console.log('Client IP:', clientIP);
      const clientIPupdated = clientIP.replace(/^::ffff:/, '');
      console.log('Client IP after removing prefix:', clientIPupdated);
      const updatedData = data.replace(/{{your_ip}}/g, clientIPupdated);
      res.end(updatedData);
    });
  } else if (req.url.startsWith('/public/') && req.method === 'GET') {
    const filePath = path.join(__dirname, req.url);
    fs.readFile(filePath, (err, data) => {
      const ext = path.extname(filePath);
      let contentType = 'text/plain';
      if (ext === '.html') contentType = 'text/html';
      else if (ext === '.css') contentType = 'text/css';
      else if (ext === '.js') contentType = 'application/javascript';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  } else if (req.url === '/run' && req.method === 'POST') {
    let requestBody = '';
    req.on('data', chunk => { requestBody += chunk.toString(); });
    
    req.on('end', () => {
      console.log('Received command:', requestBody);
      // Validate command: reject if any banned command appears.
      if (banned_command.some(cmd => requestBody.includes(cmd))) {
        res.end("Unauthorized command.");
        return;
      }
      // Use the client IP (cleaned) to determine the folder.
      const clientIPupdated = req.socket.remoteAddress.replace(/^::ffff:/, '');
      const clientDir = path.join(__dirname, 'client_folders', clientIPupdated);
      // Create the folder with permissions 0700 (owner full rwx)
      fs.mkdir(clientDir, { recursive: true, mode: 0o700 }, (err) => {
        if (err) {
          console.error('Error creating client folder:', err);
          res.statusCode = 500;
          return res.end('Error establishing your workspace.');
        }
        console.log(`Client folder ${clientDir} created (or exists).`);
        // Spawn the command in client's folder
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
  }
});

server.listen(3000, () => {
  console.log('Server is listening on port 3000');
});