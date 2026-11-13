import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

// Obtener __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;

// 1. Crear el servidor HTTP que lee ./public/index.html y responde con estado 200 y Content-Type text/html
const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, 'public', 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

// 2. Crear el objeto WebSocketServer pasando { server } como opción
const wss = new WebSocketServer({ server });

// 3. Registrar un oyente 'connection' en wss
wss.on('connection', (socket, req) => {
  // 4. Analizar el nombre de usuario del cliente desde la cadena de consulta de la URL
  const username = new URL(req.url, "http://localhost").searchParams.get("username");

  // 5. Transmitir inmediatamente un mensaje del sistema a todos los clientes conectados de que se unió
  const joinMessage = JSON.stringify({ type: "system", text: `${username} joined` });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(joinMessage);
    }
  });

  // 6. Registrar un oyente 'message' en el socket
  socket.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      const chatMessage = JSON.stringify({
        type: 'chat',
        username: parsedMessage.username,
        text: parsedMessage.text
      });

      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(chatMessage);
        }
      });
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  });

  // 7. Registrar un receptor 'close' en el socket para notificar cuando alguien se va
  socket.on('close', () => {
    const leaveMessage = JSON.stringify({ type: "system", text: `${username} left` });
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(leaveMessage);
      }
    });
  });
});

// 8. Iniciar el servidor llamando a server.listen
server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});