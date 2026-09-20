# Meno ????

> **Your clique. Your circle. Your campus.**

Meno is a real-time student social and study app built for university students. Chat with friends, form study groups, track assignments, focus with Pomodoro, and get AI-powered study help ? all in one place.

---

## ? Features

### ?? Messaging
- **Private DMs** ? Message anyone by email or phone number
- **Cliques** ? Create group chats for your squad or study group
- **Real-time messaging** powered by Socket.io
- **Voice & Video calls** ? Peer-to-peer WebRTC calls directly in the app
- **Voice notes** ? Record and send audio messages
- **Share images & files** ? Send photos and documents instantly
- **Emoji reactions** ? React to any message
- **Read receipts** ? See when your message has been read ??
- **Typing indicators** ? Know when someone is typing
- **Message search** ? Find any message in a chat
- **Pin messages** ? Pin important messages to the top
- **Polls** ? Create polls and vote in group chats
- **Icebreakers** ? Auto-generated conversation starters for new DMs

### ?? Study Tools
- **Homework Tracker** ? Add assignments with subject, due date and priority
- **Pomodoro Timer** ? Focus timer with 25/5/15 minute modes and session stats
- **AI Study Assistant** ? Powered by Groq, ask anything right inside a chat
- **Study Sessions** ? Schedule study sessions inside any Clique
- **Auto Study Groups** ? Automatically matched to a study group based on your school, course and level

### ?? Profile & Social
- **User profiles** ? Bio, mood emoji, avatar color, academic info
- **Mood status** ? Set your current mood so your friends can see
- **Contacts** ? Add and manage friends by email or phone
- **Dark / Light mode** ? Toggle between themes
- **Push notifications** ? Get notified even when the app is closed

---

## ?? Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js + Express.js |
| **Real-time** | Socket.io |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | JWT + bcrypt |
| **File Uploads** | Multer + private Supabase Storage |
| **Voice/Video Calls** | WebRTC (peer-to-peer) |
| **Push Notifications** | Web Push (VAPID) |
| **AI Assistant** | Anthropic Claude API |
| **Frontend** | Vanilla HTML, CSS, JavaScript |
| **Hosting** | Railway |

---

## ?? Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) v18 or higher
- A [Supabase](https://supabase.com) account with a new project
- A [Railway](https://railway.app) account (for deployment)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/meno-app.git
cd meno-app
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create your Supabase database
1. Create a new Supabase project.
2. Open the SQL editor and run the migration in `supabase/schema.sql`.
3. Copy your project URL and anon/service keys from the Supabase dashboard.

The schema creates private `course-files` and `chat-files` Storage buckets. Course documents, chat attachments, and voice notes are uploaded through the authenticated server and are not stored on the application filesystem.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to
   `http://localhost:3000` while developing. Add `http://localhost:3000/**` to the
   Redirect URLs list, then add the production URL and its callback path before deployment.
5. To enable Google sign-in:
   - In Google Cloud Console, create an OAuth Web application.
   - Add `http://localhost:3000` under Authorized JavaScript origins.
   - Add `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` under Authorized redirect URIs.
   - In Supabase **Authentication → Providers → Google**, enable Google and paste the
     Google client ID and client secret.
   - Restart Meno and use **Continue with Google**. Supabase returns the provider session
     to `APP_URL`, where Meno exchanges it for its protected application session.
6. For registration verification and password reset emails, configure Supabase
   **Authentication → SMTP Settings** for production. Keep the default Supabase email
   service for local testing only, then verify the email templates link back to
   `APP_URL` and test both flows from the login screen.

### 4. Set up environment variables
```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
APP_URL=http://localhost:3000
JWT_SECRET=your_random_secret_here
PORT=3000

# Optional - for AI assistant
GROQ_API_KEY=your_groq_api_key
# Optional model override
# GROQ_MODEL=llama-3.3-70b-versatile

# Optional - for push notifications
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:you@example.com
```

### 5. Run locally
```bash
npm run dev
```

Open your browser and go to **http://localhost:3000** ??

---

## ?? Deploy to Railway

1. Push your code to **GitHub**
2. Go to **[railway.app](https://railway.app)** and sign in with GitHub
3. Click **New Project** ? **Deploy from GitHub repo**
4. Select your **meno-app** repository
5. Click the app card ? go to **Variables** tab
6. Add your environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - `APP_URL`
   - `JWT_SECRET`
7. Go to **Settings** ? **Domains** ? **Generate Domain**
8. Your app is live! ??

---

## ?? Project Structure

```
meno-app/
├── server.js          ← Node.js backend (API + Socket.io)
├── package.json       ← Dependencies
├── .env.example       ← Environment variables template
├── supabase/
│   └── schema.sql     ← Supabase database schema
├── .gitignore
└── public/
    ├── index.html     ← Full frontend (HTML + CSS + JS)
    └── sw.js          ← Service worker for push notifications
```

Course spaces are private by default. A course owner creates the space and can invite
existing Meno users by email from the course management flow.

---

## ?? Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ? Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ? Yes | Server-side key for database access |
| `SUPABASE_ANON_KEY` | ? Yes | Public anon key for browser/client access |
| `APP_URL` | ? Yes | URL used for verification and password reset links |
| `JWT_SECRET` | ? Yes | Any long random string for token signing |
| `PORT` | ? No | Server port (default: 3000) |
| `GROQ_API_KEY` | ? No | Groq API key for AI assistant |
| `GROQ_MODEL` | ? No | Optional Groq model name |
| `VAPID_PUBLIC_KEY` | ? No | For push notifications |
| `VAPID_PRIVATE_KEY` | ? No | For push notifications |
| `VAPID_EMAIL` | ? No | For push notifications |

---

## ?? Responsive Design

Meno works on all screen sizes:
- ?? **Mobile** ? Bottom navigation, full-screen chat, slide-in sidebar
- ?? **Tablet / Desktop** ? Full sidebar layout with chat panel

---

## ?? Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## ?? License

This project is licensed under the MIT License.

---
