# 🎬 VibeCast - Premium Real-Time Watch Party

![VibeCast Banner](https://img.shields.io/badge/VibeCast-Live_Sync_Platform-blue?style=for-the-badge&logo=youtube) 
![Status](https://img.shields.io/badge/Mobile_Optimized-Yes-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**VibeCast** is a real-time collaborative streaming application that allows multiple users to watch videos in perfect synchronization. Whether you are on a laptop or a mobile phone, VibeCast ensures that when one person pauses, everyone pauses.

The platform features a **WhatsApp-style chat**, **live flying reactions**, and a **fully responsive mobile layout**.

---

## 🚀 Key Features

### 🎥 Synchronized Playback
* **Universal Player:** Supports both **YouTube IFrame API** and **HTML5 Video** (Direct .mp4, .webm).
* **State Sync:** Synchronizes Play, Pause, Seek, and Buffering events across all clients.
* **Autoplay Fix:** Includes a smart **"Click to Join"** overlay to bypass browser autoplay restrictions on mobile devices.
* **Loop Protection:** Advanced semaphore lock (`isSyncing`) prevents infinite feedback loops.

### 📱 Mobile Optimized
* **Responsive Layout:** Uses Dynamic Viewport Height (`100dvh`) to prevent address bars from cutting off the chat.
* **Touch-Friendly:** Larger buttons and optimized chat input for mobile keyboards.
* **Adaptive UI:** Automatically resizes the video player (40%) and chat window (60%) on smaller screens for the best experience.

### 💬 Real-Time Interaction
* **WhatsApp-Style Chat:** Distinct UI for "My Messages" (Right/Green) vs "Others" (Left/Gray).
* **Audio Notifications:** Subtle "Pop" sound when receiving new messages.
* **Live Reactions:** Floating emoji animations (❤️, 😂, 🔥) that overlay the video player.
* **Persistent Identity:** Uses `localStorage` to remember your username.

---

## ⚙️ Technical Architecture

VibeCast is built on a **Client-Server architecture** using **Node.js** and **Socket.io**.

### **Tech Stack**
* **Frontend:** HTML5, CSS3 (Flexbox/Grid, `dvh` units), Vanilla JavaScript.
* **Backend:** Node.js, Express.js.
* **Communication:** Socket.io (WebSockets) for full-duplex communication.

### **Synchronization Logic (The "Brain")**
To prevent the common "Pause Loop" bug, VibeCast uses a **Semaphore Lock**:
1.  **User A** clicks "Pause".
2.  Client emits `video_action` to Server.
3.  Server broadcasts `sync_action` to **User B**.
4.  **User B** sets `isSyncing = true` → Pauses Video → Ignores the resulting "pause" event → Sets `isSyncing = false`.

---

## 📂 Project Structure

```text
VibeCast/
├── public/             # Frontend Assets
│   ├── index.html      # Main App Structure (with Click-to-Join overlay)
│   ├── style.css       # Responsive CSS & Dark Mode
│   └── script.js       # Socket.io Client Logic & Sync Handlers
├── index.js            # Main Server Entry Point (Socket.io Backend)
├── package.json        # Dependencies
├── .gitignore          # Git Configuration
└── README.md           # Documentation
