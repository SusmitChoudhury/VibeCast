const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let roomUsers = {}; // Track users per room

io.on('connection', (socket) => {
    
    // Join Room
    socket.on('join_room', ({ room, user }) => {
        socket.join(room);
        
        // Track User Count
        if (!roomUsers[room]) roomUsers[room] = 0;
        roomUsers[room]++;
        
        // Notify room of user count
        io.to(room).emit('update_viewer_count', roomUsers[room]);
        
        // Sync Request (Video State)
        socket.to(room).emit('request_sync', socket.id);
    });

    // Handle Disconnect
    socket.on('disconnecting', () => {
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
            if (roomUsers[room]) {
                roomUsers[room]--;
                io.to(room).emit('update_viewer_count', roomUsers[room]);
            }
        });
    });

    // Video Sync Logic
    socket.on('send_sync_data', (data) => {
        io.to(data.targetId).emit('receive_sync_data', data);
    });
    
    socket.on('video_action', (data) => {
        socket.to(data.room).emit('sync_action', data);
    });

    // Chat Logic
    socket.on('send_message', (data) => {
        io.in(data.room).emit('receive_message', data);
    });

    // NEW: Reaction Logic (Flying Emojis)
    socket.on('send_reaction', (data) => {
        io.in(data.room).emit('receive_reaction', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`VibeCast Server running on port ${PORT}`);
});