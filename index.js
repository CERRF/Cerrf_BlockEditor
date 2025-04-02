const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const server = http.createServer((req, res) => {
    if (req.url === '/' && req.method === 'GET') {
        fs.readFile(path.join(__dirname, '/public/index.html'), 'utf-8', (err, data) => {
            if (err) {
                res.statusCode = 500;
                return res.end('Error loading index.html');
            }
            const clientIP = req.socket.remoteAddress; // this is how we can get the client's IP address
            console.log('Client IP:', clientIP); // this prints it to console when the server is running
            clientIPupdated = clientIP.replace(/^::ffff:/, ''); // this removes the IPv6 prefix if it exists 
            console.log('Client IP after removing prefix:', clientIPupdated); // this prints the cleaned IP address to console
            const updatedData = data.replace(/{{your_ip}}/g, clientIPupdated); // this replaces the placeholder in the HTML with the actual IPv4 address
            console.log('Updated HTML with IP:', updatedData); // this prints the updated HTML to console
            res.end(updatedData);
        });
    } else if (req.url.startsWith('/public/') && req.method === 'GET') {
        const filePath = path.join(__dirname, req.url);
        fs.readFile(filePath, (err, data) => {
            const ext = path.extname(filePath);
            let contentType = 'text/plain';
            if (ext === '.html') {
                contentType = 'text/html';
            } else if (ext === '.css') {
                contentType = 'text/css';
            } else if (ext === '.js') {
                contentType = 'application/javascript';
            }
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
            
        });
    } else if (req.url === '/run' && req.method === 'POST') {
        let requestBody = '';
        req.on('data', chunk => {
        requestBody += chunk.toString();
    });
        req.on('end', () => {
        console.log('Received command:', requestBody);
        const child = spawn(requestBody, { shell: true });
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
}
});
server.listen(3000, () => {
    console.log('server is listening on port 3000');
});