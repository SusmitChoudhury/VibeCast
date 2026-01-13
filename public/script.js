const socket = io();

// DOM Elements
const landingPage = document.getElementById('landing-page');
const roomPage = document.getElementById('room-page');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const createNameInput = document.getElementById('createName');
const joinNameInput = document.getElementById('joinName');
const joinCodeInput = document.getElementById('joinCode');
const roomDisplay = document.getElementById('roomDisplay');
const viewerCountDisplay = document.getElementById('viewerCount');
const chatWindow = document.getElementById('chatWindow');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const loadBtn = document.getElementById('loadBtn');
const videoUrlInput = document.getElementById('videoUrl');
const myVideo = document.getElementById('myVideo');
const placeholder = document.getElementById('placeholder-screen');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const flyingEmojiContainer = document.getElementById('flying-emoji-container');
const overlay = document.getElementById('click-to-play-overlay'); // NEW
const syncBtn = document.getElementById('syncBtn'); // NEW

// State
let currentRoom = null;
let username = "Anonymous";
let player; 
let isYouTube = false;
let isSyncing = false;

// Auto-Save Username
window.addEventListener('load', () => {
    const savedName = localStorage.getItem('vibe_username');
    if (savedName) {
        createNameInput.value = savedName;
        joinNameInput.value = savedName;
    }
});

// --- NAVIGATION ---
createBtn.addEventListener('click', () => {
    const name = createNameInput.value.trim() || 'Host';
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    enterRoom(code, name);
});

joinBtn.addEventListener('click', () => {
    const name = joinNameInput.value.trim() || 'Guest';
    const code = joinCodeInput.value.trim().toUpperCase();
    if (code) enterRoom(code, name);
    else alert("Please enter a room code!");
});

function enterRoom(code, name) {
    currentRoom = code;
    username = name;
    localStorage.setItem('vibe_username', name);
    
    landingPage.classList.add('hidden');
    roomPage.classList.remove('hidden');
    roomDisplay.innerText = code;

    socket.emit('join_room', { room: code, user: name });
    addSystemMessage(`You joined room: ${code}`);
}

copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentRoom);
    alert("Room Code Copied!");
});

// --- BUTTON LOGIC: THE MOBILE FIX ---
syncBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    
    // Unmute and Play YouTube if available
    if(isYouTube && player && typeof player.unMute === 'function') {
        player.unMute();
        player.playVideo();
    } else if (!isYouTube) {
        myVideo.play();
    }
    
    // Ask server for the latest time immediately to ensure sync
    socket.emit('request_sync', socket.id);
});

// --- VIDEO LOGIC ---
loadBtn.addEventListener('click', () => {
    const url = videoUrlInput.value.trim();
    if(!url) return;
    loadVideo(url);
    socket.emit('video_action', { room: currentRoom, type: 'load', url: url });
});

function loadVideo(url) {
    placeholder.classList.add('hidden');
    
    // If I am loading the video, I don't need the overlay
    overlay.classList.add('hidden');

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        isYouTube = true;
        myVideo.classList.add('hidden');
        document.getElementById('player').classList.remove('hidden');
        
        let videoId = "";
        if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
        else if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];

        if (player && typeof player.loadVideoById === 'function') {
            player.loadVideoById(videoId);
        } else {
            player = new YT.Player('player', {
                height: '100%', width: '100%', videoId: videoId,
                playerVars: { 'autoplay': 1, 'controls': 1 },
                events: { 'onStateChange': onPlayerStateChange }
            });
        }
    } else {
        isYouTube = false;
        document.getElementById('player').classList.add('hidden');
        myVideo.classList.remove('hidden');
        myVideo.src = url;
        myVideo.play().catch(e => {
            console.log("Autoplay failed locally:", e);
        });
    }
}

// --- SYNC LOGIC ---
socket.on('request_sync', (requesterId) => {
    const url = videoUrlInput.value;
    if (!url) return;
    let currentTime = isYouTube && player ? player.getCurrentTime() : myVideo.currentTime;
    let isPlaying = isYouTube && player ? (player.getPlayerState() === 1) : !myVideo.paused;
    socket.emit('send_sync_data', { targetId: requesterId, url, time: currentTime, isPlaying });
});

socket.on('receive_sync_data', (data) => {
    isSyncing = true;
    
    // If URL is different, load it
    if (videoUrlInput.value !== data.url) {
        videoUrlInput.value = data.url;
        loadVideo(data.url);
        // Guests might need to click to join initially
        overlay.classList.remove('hidden');
    }

    setTimeout(() => {
        if(isYouTube && player) { 
            player.seekTo(data.time); 
            if(data.isPlaying) player.playVideo(); 
        } else { 
            myVideo.currentTime = data.time; 
            if(data.isPlaying) {
                // Try to play. If browser blocks it, SHOW BUTTON.
                var playPromise = myVideo.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.log("Autoplay blocked! Showing button.");
                        overlay.classList.remove('hidden');
                    });
                }
            }
        }
        isSyncing = false;
    }, 1000);
});

function onPlayerStateChange(event) {
    if (isSyncing) return;
    if (event.data == YT.PlayerState.PLAYING) socket.emit('video_action', { room: currentRoom, type: 'play', time: player.getCurrentTime() });
    else if (event.data == YT.PlayerState.PAUSED) socket.emit('video_action', { room: currentRoom, type: 'pause' });
}

myVideo.onplay = () => { if (!isSyncing) socket.emit('video_action', { room: currentRoom, type: 'play', time: myVideo.currentTime }); };
myVideo.onpause = () => { if (!isSyncing) socket.emit('video_action', { room: currentRoom, type: 'pause' }); };

socket.on('sync_action', (data) => {
    isSyncing = true;
    if (data.type === 'load') { 
        videoUrlInput.value = data.url; 
        loadVideo(data.url); 
        overlay.classList.remove('hidden'); // Show button for guests on load
    } 
    else if (data.type === 'play') {
        if (isYouTube && player) { 
            if(Math.abs(player.getCurrentTime() - data.time) > 1) player.seekTo(data.time); 
            player.playVideo(); 
        } else { 
            if(Math.abs(myVideo.currentTime - data.time) > 1) myVideo.currentTime = data.time; 
            myVideo.play().catch(() => overlay.classList.remove('hidden')); 
        }
    } 
    else if (data.type === 'pause') {
        if (isYouTube && player) player.pauseVideo(); else myVideo.pause();
    }
    setTimeout(() => { isSyncing = false; }, 500);
});

// --- CHAT & REACTION LOGIC (Unchanged) ---
sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMessage(); });

function sendMessage() {
    const msg = msgInput.value.trim();
    if(msg) {
        addMessage(username, msg, true); 
        socket.emit('send_message', { room: currentRoom, user: username, text: msg });
        msgInput.value = '';
    }
}
socket.on('receive_message', (data) => {
    if (data.user !== username) {
        addMessage(data.user, data.text, false);
        const sound = document.getElementById('msg-sound');
        if(sound) sound.play().catch(e => console.log("Audio play failed"));
    }
});
function addMessage(user, text, isSelf) {
    const div = document.createElement('div');
    div.classList.add('chat-msg');
    div.classList.add(isSelf ? 'self' : 'other');
    div.innerHTML = `<strong>${isSelf ? 'You' : user}</strong> ${text}`;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}
function addSystemMessage(text) {
    const div = document.createElement('div');
    div.classList.add('system-msg');
    div.innerText = text;
    chatWindow.appendChild(div);
}
window.sendReaction = function(emoji) {
    socket.emit('send_reaction', { room: currentRoom, emoji: emoji });
    showFlyingEmoji(emoji);
};
socket.on('receive_reaction', (data) => showFlyingEmoji(data.emoji));
function showFlyingEmoji(emoji) {
    const el = document.createElement('div');
    el.innerText = emoji;
    el.classList.add('fly-emoji');
    el.style.left = Math.random() * 80 + '%';
    flyingEmojiContainer.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}
socket.on('update_viewer_count', (count) => viewerCountDisplay.innerText = count);