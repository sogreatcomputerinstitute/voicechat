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

    socket.on('mediaStream', (streamObj) => {
        const username = users[socket.id];
        userStreams[socket.id] = streamObj;
        console.log('Media stream received.');
        // Broadcast the stream to all connected clients
        socket.broadcast.emit('mediaStream', streamObj, username);
    });

    socket.on('disconnect', () => {
        const username = users[socket.id];
        console.log('A user disconnected:', socket.id);
        delete users[socket.id];
        delete userStreams[socket.id];
        io.emit('userLeft', username);
        io.emit('updateUsers', users);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
