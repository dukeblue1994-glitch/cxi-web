import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 8888;

// Import scoring function
let scoreFunction;
try {
  const scoreModule = await import('./netlify/functions/score.js');
  scoreFunction = scoreModule.default;
} catch (err) {
  console.warn('Could not load score function:', err.message);
}

const server = createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // Handle score function
  if (url.pathname === '/.netlify/functions/score' && req.method === 'POST') {
    if (!scoreFunction) {
      res.writeHead(501, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Score function not available' }));
      return;
    }
    
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const mockEvent = {
          httpMethod: 'POST',
          body: body,
          headers: req.headers
        };
        const result = await scoreFunction(mockEvent, {});
        res.writeHead(result.statusCode || 200, { 'Content-Type': 'application/json' });
        res.end(result.body);
      } catch (err) {
        console.error('Score function error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
    return;
  }
  
  // Serve static files
  let filePath = join(__dirname, 'dist', url.pathname === '/' ? 'index.html' : url.pathname);
  
  try {
    const content = readFileSync(filePath);
    let contentType = 'text/html';
    
    if (filePath.endsWith('.js')) contentType = 'application/javascript';
    else if (filePath.endsWith('.css')) contentType = 'text/css';
    else if (filePath.endsWith('.json')) contentType = 'application/json';
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    if (url.pathname !== '/favicon.ico') {
      console.log('File not found:', filePath);
    }
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Score function loaded:', !!scoreFunction);
});
