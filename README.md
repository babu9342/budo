# BUDO — Mobile-First Multiplayer Ludo Web Application & PWA

**BUDO** is a production-ready, mobile-first, responsive real-time multiplayer Ludo web application built using **React 18**, **Vite**, **Redux Toolkit**, **Node.js**, **Socket.IO**, and **PostgreSQL** (pure native SQL).

---

## 🌟 Key Features

1. **Mobile-First App-Like UI & PWA**:
   - Tailored specifically for Android & iOS mobile screen sizes (320px, 360px, 375px, 390px, 412px, 430px) with responsive desktop centering.
   - PWA support with Web App Manifest & Service Worker for instant **Add to Home Screen / Install App** on Android and iPhone.
2. **Server-Authoritative Real-Time Multiplayer (2 to 8 Players)**:
   - Dynamic 2, 4, 6, and 8 Player Board layouts with dynamic home zones, tracks, stars, and safe zones.
   - Cryptographically fair server-side dice generator and strict move validation (client cannot tamper with turns, dice, or token movements).
3. **Private Match Rooms & Direct Social Sharing**:
   - 8-digit numeric room codes (e.g. `03514568`).
   - One-tap WhatsApp invitation links and Web Share API integration (`https://budo-game.com/join/03514568`).
   - Seamless deep link handling with automatic login redirection preservation.
4. **Interactive In-Game Voice, Text & Sticker Chat**:
   - Real-time in-game chat drawer (bottom-sheet modal).
   - Instant reaction stickers (`GG`, `Nice!`, `🔥`, `🎉`, `😡`, `👏`, `Oops!`, `Good Luck!`).
   - Web Audio `MediaRecorder` voice messaging with audio preview and waveform playback.
5. **90s Retro Profile Photo Studio**:
   - 6 nostalgic vintage styles (`Classic 90s Portrait`, `90s College Style`, `90s Film Camera`, `90s Street Style`, `90s Studio Portrait`, `90s Family Photo`).
   - Built-in retro film grain, warm halation, vignette overlays, and classic amber date stamp (`'96 09 16`).
6. **Offline Mode & Smart AI Computer Bots**:
   - Play offline without an internet connection.
   - AI bot opponents with 3 difficulty modes (`Easy`, `Medium`, `Hard`).
   - Local Pass & Play mode.
7. **Tactile Haptics & Dynamic Web Audio Synthesizer**:
   - Arcade audio synthesizers for dice rolls, token hops, captures, and victory fanfare.
   - Mobile haptic vibration feedback on tap, roll, and victory.
8. **Pure Native PostgreSQL Database**:
   - 10 relational tables using raw SQL queries (`users`, `rooms`, `room_players`, `games`, `game_players`, `game_moves`, `rankings`, `chat_messages`, `audio_messages`, `game_history`).

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+) *(Optional for local dev: in-memory SQL fallback kicks in automatically if PG is not running)*

### 1. Clone & Setup Backend
```bash
cd server
npm install
npm run dev
```
*Server boots on `http://localhost:5000`.*

### 2. Setup Frontend
```bash
cd client
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🗄️ PostgreSQL Database Schema

To initialize PostgreSQL manually in production, run `server/sql/schema.sql`:

```sql
psql -U postgres -d budo -f server/sql/schema.sql
```

Tables created:
- `users`
- `rooms`
- `room_players`
- `games`
- `game_players`
- `game_moves`
- `rankings`
- `chat_messages`
- `audio_messages`
- `game_history`

---

## ⚡ Socket.IO Real-Time Events

| Event | Direction | Description |
|---|---|---|
| `room:join` | Client ➔ Server | Join room lobby with user session |
| `room:update` | Server ➔ Room | Broadcast updated roster and host |
| `room:ready` | Client ➔ Server | Toggle player ready status |
| `room:addBot` | Client ➔ Server | Add AI bot into room slot |
| `room:start` | Host ➔ Server | Start real-time match |
| `game:start` | Server ➔ Room | Broadcast initial board state |
| `dice:roll` | Client ➔ Server | Request server dice roll |
| `dice:result` | Server ➔ Room | Broadcast dice result & valid tokens |
| `token:move` | Client ➔ Server | Select and move valid token |
| `token:update` | Server ➔ Room | Broadcast step, capture & turn switch |
| `game:finish` | Server ➔ Room | Match victory and rankings update |
| `chat:message` | Bidirectional | Real-time text message |
| `chat:sticker` | Bidirectional | Animated sticker reaction |
| `chat:audio` | Bidirectional | Voice audio note |

---

## 🌐 Production Deployment

### Frontend (e.g. Vercel, Netlify, Cloudflare Pages)
Set environment variables:
```env
VITE_API_URL=https://api.budo-game.com
VITE_SOCKET_URL=https://api.budo-game.com
```
Build command: `npm run build`  
Publish directory: `dist`

### Backend (e.g. Railway, Render, Fly.io, AWS)
Set environment variables:
```env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/budo
JWT_SECRET=your_super_secure_jwt_secret_key
CLIENT_URL=https://budo-game.com
```
Start command: `npm start`

---

## 📱 Android PWA Installation

1. Open `https://budo-game.com` in **Chrome for Android**.
2. Tap the browser menu `⋮` or the in-app **Install App** banner.
3. Tap **Add to Home Screen**.
4. Launch **Budo** from the home screen for a full-screen, standalone mobile gaming experience!
