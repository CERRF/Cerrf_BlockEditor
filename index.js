const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const banned_command = ['python', 'python3', 'bash', 'powershell', 'cmd', 'git', 'scp', 'ftp', 'telnet', 'nc', 'ncat', 'perl', 'ruby', 'php', 'java', 'node', 'npm'];
const clientIP = '' // this is how we can get the client's IP address

const server = http.createServer((req, res) => {
    if (req.url === '/' && req.method === 'GET') {
        fs.readFile(path.join(__dirname, '/public/index.html'), 'utf-8', (err, data) => {
            if (err) {
                res.statusCode = 500;
                return res.end('Error loading index.html');
            }
            // this is how we can get the client's IP address
            console.log('Client IP:', clientIP); // this prints it to console when the server is running
            clientIPupdated = clientIP.replace(/^::ffff:/, ''); // this removes the IPv6 prefix if it exists 
            console.log('Client IP after removing prefix:', clientIPupdated); // this prints the cleaned IP address to console
            const updatedData = data.replace(/{{your_ip}}/g, clientIPupdated); // this replaces the placeholder in the HTML with the actual IPv4 address
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
        /*if (requestBody.includes(banned_command)) {
            console.log('Command not allowed:', requestBody);
            res.statusCode = 403; // Forbidden
            return res.end('Command not allowed bc this bs aint allowed brev');
        }*/
    });
        
        
        
        req.on('end', () => {
        console.log('Received command:', requestBody);
        if(banned_command.some(command => requestBody.includes(command))){
            res.end("fuck you");
        }
        else{
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
    }
    });

} else if (req.url === '/workshops' && req.method === 'GET') {
    // List all workshop files in the "public/workshops" folder.
    const workshopsDir = path.join(__dirname, '/public/workshops');
    fs.readdir(workshopsDir, (err, files) => {
        if (err) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: "Could not read workshops directory" }));
        }
        // Filter workshop files by extension (e.g., awf)
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
    console.log('server is listening on port 3000');
});