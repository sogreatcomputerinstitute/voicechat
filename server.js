const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let users = {};
let userStreams = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join', (username) => {
        users[socket.id] = username;
        io.emit('userJoined', username);
        io.emit('updateUsers', users);

        // Send existing user streams to the new user
        for (let id in userStreams) {
            if (id !== socket.id) {
                socket.emit('existingStream', userStreams[id], users[id]);
            }
        }
    });

    socket.on('disconnect', () => {
        const username = users[socket.id];
        console.log('A user disconnected:', socket.id);
        delete users[socket.id];
        delete userStreams[socket.id];
        io.emit('userLeft', username);
        io.emit('updateUsers', users);
    });

  socket.on('mediaStream', (streamObj) => {
        const username = socket.username;
        console.log('Media stream received.');
        // Broadcast the stream to all connected clients
        socket.broadcast.emit('mediaStream', streamObj, username);
    });

server.listen(3000, () => {
    console.log('Server is listening on port 3000');
});
