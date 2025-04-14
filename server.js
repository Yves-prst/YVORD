const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public')); // pasta onde está seu HTML, CSS, JS

io.on('connection', socket => {
  console.log('Usuário conectado:', socket.id);

  socket.on('join-room', room => {
    socket.join(room);
    socket.to(room).emit('user-joined', socket.id);
  });

  socket.on('offer', (data) => {
    socket.to(data.to).emit('offer', {
      from: socket.id,
      offer: data.offer
    });
  });

  socket.on('answer', (data) => {
    socket.to(data.to).emit('answer', {
      from: socket.id,
      answer: data.answer
    });
  });

  socket.on('candidate', (data) => {
    socket.to(data.to).emit('candidate', {
      from: socket.id,
      candidate: data.candidate
    });
  });

  socket.on('disconnect', () => {
    io.emit('user-disconnected', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
