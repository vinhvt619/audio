import http from 'http';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(302, {
    Location: `http://localhost:5173${req.url || '/'}`,
    'Access-Control-Allow-Origin': '*',
  });
  res.end();
});

server.listen(5174, () => {
  console.log('Redirecting all requests from http://localhost:5174 to http://localhost:5173');
});

