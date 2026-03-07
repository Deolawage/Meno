# Meno v2 — Student Chat App

Your clique. Your circle. Your campus.

## ✨ Features
- 💬 Private DMs + 🔗 Cliques (group chats)
- 🌙☀️ Dark / Light mode toggle
- 🔔 Push notifications (real device alerts)
- 🤖 AI Study Assistant (powered by Claude AI)
- 📞📹 Voice & Video calls (WebRTC, peer-to-peer)
- 📎 Share images & files
- 📚 Homework & assignment tracker
- 🍅 Pomodoro focus timer with stats
- ⚡ Real-time with Socket.io
- 🔐 JWT authentication

## 🗂 Project Structure
```
meno/
├── server.js           ← Node.js backend (all API + sockets)
├── package.json
├── .env.example        ← Copy to .env and fill in
├── .gitignore
└── public/
    ├── index.html      ← Full frontend
    └── sw.js           ← Service worker for push notifications
```

## 🚀 Quick Start

### 1. Install
```bash
npm install
```

### 2. Configure
```bash
cp .env.example .env
# Then edit .env with your values
```

### 3. Run locally
```bash
npm run dev
# Open http://localhost:3000
```

---

## ⚙️ Environment Variables

| Variable | Where to get it |
|---|---|
| `MONGODB_URI` | mongodb.com/atlas → Free cluster → Connect |
| `JWT_SECRET` | Any random string (make it long) |
| `ANTHROPIC_API_KEY` | console.anthropic.com (for AI assistant) |
| `VAPID_PUBLIC_KEY` | Run: `node -e "const wp=require('web-push');console.log(wp.generateVAPIDKeys())"` |
| `VAPID_PRIVATE_KEY` | Same as above |

---

## ☁️ Deploy to Render (Free)

1. Push this folder to **GitHub**
2. Go to **render.com** → New Web Service
3. Connect your repo
4. Set:
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. Add all environment variables from `.env`
6. Deploy!

Your app goes live at `https://your-app.onrender.com` 🎉

---

## 🔮 How to Add More Features

Since you own the code, adding features is straightforward:

- **New API route**: Add `app.get/post(...)` in `server.js`
- **New socket event**: Add `socket.on(...)` in the `io.on('connection')` block
- **New UI panel**: Add a new tab in the sidebar and render function in `index.html`
- **New DB model**: Add a new Mongoose schema in `server.js`
