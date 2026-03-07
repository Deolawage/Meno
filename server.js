require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const cors       = require('cors');
const path       = require('path');
const multer     = require('multer');
const fs         = require('fs');
const webpush    = require('web-push');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' }, maxHttpBufferSize: 10e6 });

// ── MIDDLEWARE ────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── FILE UPLOADS ──────────────────────────────────────────────
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-z0-9.]/gi, '_'))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// ── WEB PUSH ──────────────────────────────────────────────────
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:meno@app.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// ── DATABASE ──────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ── SCHEMAS ───────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  password:     { type: String, required: true },
  color:        { type: String, default: '#6c63ff' },
  bio:          { type: String, default: '' },
  online:       { type: Boolean, default: false },
  theme:        { type: String, default: 'dark' },
  pushSub:      { type: Object, default: null },
  lastSeen:     { type: Date, default: Date.now },
}, { timestamps: true });

const MessageSchema = new mongoose.Schema({
  roomId:      { type: String, required: true, index: true },
  senderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderName:  { type: String },
  senderColor: { type: String },
  text:        { type: String, default: '' },
  type:        { type: String, default: 'text', enum: ['text','image','file','ai'] },
  fileUrl:     { type: String },
  fileName:    { type: String },
  fileSize:    { type: Number },
  reactions:   { type: Map, of: Number, default: {} },
}, { timestamps: true });

const DMSchema = new mongoose.Schema({
  members:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  roomId:   { type: String, unique: true },
  lastMsg:  { type: String, default: '' },
  lastAt:   { type: Date, default: Date.now },
}, { timestamps: true });

const CliqueSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  emoji:     { type: String, default: '🔗' },
  color:     { type: String, default: '#6c63ff' },
  members:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastMsg:   { type: String, default: '' },
  lastAt:    { type: Date, default: Date.now },
}, { timestamps: true });

const HomeworkSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:     { type: String, required: true },
  subject:   { type: String, default: '' },
  dueDate:   { type: Date },
  priority:  { type: String, default: 'medium', enum: ['low','medium','high'] },
  done:      { type: Boolean, default: false },
  notes:     { type: String, default: '' },
}, { timestamps: true });

const PomodoroSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionsToday:{ type: Number, default: 0 },
  totalSessions:{ type: Number, default: 0 },
  date:         { type: String }, // YYYY-MM-DD
}, { timestamps: true });

const User     = mongoose.model('User',     UserSchema);
const Message  = mongoose.model('Message',  MessageSchema);
const DM       = mongoose.model('DM',       DMSchema);
const Clique   = mongoose.model('Clique',   CliqueSchema);
const Homework = mongoose.model('Homework', HomeworkSchema);
const Pomodoro = mongoose.model('Pomodoro', PomodoroSchema);

// ── JWT ───────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'meno_secret_dev';
const signToken  = u => jwt.sign({ id: u._id, email: u.email }, JWT_SECRET, { expiresIn: '30d' });
const verifyToken = t => { try { return jwt.verify(t, JWT_SECRET); } catch { return null; } };
const auth = (req, res, next) => {
  const decoded = verifyToken(req.headers.authorization?.split(' ')[1]);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = decoded.id; next();
};
const safeUser = u => ({ _id: u._id, name: u.name, email: u.email, color: u.color, bio: u.bio, online: u.online, theme: u.theme });

// ── AUTH ROUTES ───────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, color } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (await User.findOne({ email })) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, color: color || '#6c63ff' });
    res.json({ token: signToken(user), user: safeUser(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'No account with that email' });
    if (!await bcrypt.compare(password, user.password)) return res.status(400).json({ error: 'Incorrect password' });
    res.json({ token: signToken(user), user: safeUser(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/me',             auth, async (req, res) => { const u = await User.findById(req.userId); res.json(safeUser(u)); });
app.get('/api/users/search',   auth, async (req, res) => { const u = await User.findOne({ email: req.query.email?.toLowerCase() }); if (!u) return res.status(404).json({ error: 'No Meno user with that email' }); res.json(safeUser(u)); });

app.patch('/api/me/theme', auth, async (req, res) => {
  const u = await User.findByIdAndUpdate(req.userId, { theme: req.body.theme }, { new: true });
  res.json(safeUser(u));
});

app.patch('/api/me/bio', auth, async (req, res) => {
  const u = await User.findByIdAndUpdate(req.userId, { bio: req.body.bio }, { new: true });
  res.json(safeUser(u));
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────────
app.get('/api/push/vapid-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

app.post('/api/push/subscribe', auth, async (req, res) => {
  await User.findByIdAndUpdate(req.userId, { pushSub: req.body.subscription });
  res.json({ ok: true });
});

async function sendPush(userId, title, body, data = {}) {
  try {
    const user = await User.findById(userId);
    if (!user?.pushSub || !process.env.VAPID_PRIVATE_KEY) return;
    await webpush.sendNotification(user.pushSub, JSON.stringify({ title, body, data }));
  } catch (e) { if (e.statusCode === 410) await User.findByIdAndUpdate(userId, { pushSub: null }); }
}

// ── DM ROUTES ─────────────────────────────────────────────────
app.get('/api/dms', auth, async (req, res) => {
  const dms = await DM.find({ members: req.userId }).sort({ lastAt: -1 }).populate('members', 'name email color online bio');
  res.json(dms);
});

app.post('/api/dms', auth, async (req, res) => {
  try {
    const ids = [req.userId.toString(), req.body.otherUserId.toString()].sort();
    const roomId = ids.join('_');
    let dm = await DM.findOne({ roomId });
    if (!dm) dm = await DM.create({ members: ids, roomId });
    dm = await dm.populate('members', 'name email color online bio');
    res.json(dm);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CLIQUE ROUTES ─────────────────────────────────────────────
app.get('/api/cliques', auth, async (req, res) => {
  const cliques = await Clique.find({ members: req.userId }).sort({ lastAt: -1 }).populate('members', 'name email color online bio');
  res.json(cliques);
});

app.post('/api/cliques', auth, async (req, res) => {
  try {
    const { name, emoji, color, memberIds } = req.body;
    const members = [...new Set([req.userId.toString(), ...(memberIds || [])])];
    const clique = await Clique.create({ name, emoji: emoji||'🔗', color: color||'#6c63ff', members, createdBy: req.userId });
    res.json(await clique.populate('members', 'name email color online bio'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cliques/:id/members', auth, async (req, res) => {
  try {
    const clique = await Clique.findByIdAndUpdate(req.params.id, { $addToSet: { members: req.body.userId } }, { new: true }).populate('members', 'name email color online bio');
    res.json(clique);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── MESSAGE ROUTES ────────────────────────────────────────────
app.get('/api/messages/:roomId', auth, async (req, res) => {
  const msgs = await Message.find({ roomId: req.params.roomId }).sort({ createdAt: 1 }).limit(100);
  res.json(msgs);
});

// ── FILE UPLOAD ───────────────────────────────────────────────
app.post('/api/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const isImage = req.file.mimetype.startsWith('image/');
  res.json({
    url:      `/uploads/${req.file.filename}`,
    name:     req.file.originalname,
    size:     req.file.size,
    isImage
  });
});

// ── AI STUDY ASSISTANT ────────────────────────────────────────
app.post('/api/ai/ask', auth, async (req, res) => {
  try {
    const { question, context } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(400).json({ error: 'AI not configured. Add ANTHROPIC_API_KEY to .env' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: 'You are Meno AI, a friendly and helpful study assistant for students. Keep answers clear, concise and encouraging. Use emojis occasionally to keep it friendly. If asked to explain something, break it down simply.',
        messages: [{ role: 'user', content: context ? `Context: ${context}\n\nQuestion: ${question}` : question }]
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'AI request failed');
    res.json({ answer: data.content[0].text });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── HOMEWORK ROUTES ───────────────────────────────────────────
app.get('/api/homework', auth, async (req, res) => {
  const hw = await Homework.find({ userId: req.userId }).sort({ dueDate: 1, createdAt: -1 });
  res.json(hw);
});

app.post('/api/homework', auth, async (req, res) => {
  try {
    const { title, subject, dueDate, priority, notes } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const hw = await Homework.create({ userId: req.userId, title, subject, dueDate, priority: priority||'medium', notes });
    res.json(hw);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/homework/:id', auth, async (req, res) => {
  const hw = await Homework.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, { new: true });
  res.json(hw);
});

app.delete('/api/homework/:id', auth, async (req, res) => {
  await Homework.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  res.json({ ok: true });
});

// ── POMODORO ROUTES ───────────────────────────────────────────
app.get('/api/pomodoro/stats', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  let stats = await Pomodoro.findOne({ userId: req.userId, date: today });
  if (!stats) stats = { sessionsToday: 0, totalSessions: 0 };
  const allTime = await Pomodoro.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(req.userId) } }, { $group: { _id: null, total: { $sum: '$sessionsToday' } } }]);
  res.json({ sessionsToday: stats.sessionsToday, totalSessions: allTime[0]?.total || 0 });
});

app.post('/api/pomodoro/complete', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const stats = await Pomodoro.findOneAndUpdate(
    { userId: req.userId, date: today },
    { $inc: { sessionsToday: 1 } },
    { upsert: true, new: true }
  );
  res.json(stats);
});

// ── SOCKET.IO ─────────────────────────────────────────────────
const onlineUsers = new Map();

io.use((socket, next) => {
  const decoded = verifyToken(socket.handshake.auth.token);
  if (!decoded) return next(new Error('Unauthorized'));
  socket.userId = decoded.id; next();
});

io.on('connection', async (socket) => {
  const uid = socket.userId;
  onlineUsers.set(uid, socket.id);
  await User.findByIdAndUpdate(uid, { online: true });
  io.emit('presence', { userId: uid, online: true });

  // Auto-join rooms
  const [dms, cliques] = await Promise.all([DM.find({ members: uid }), Clique.find({ members: uid })]);
  dms.forEach(d => socket.join(d.roomId));
  cliques.forEach(c => socket.join(c._id.toString()));

  socket.on('join_room', roomId => socket.join(roomId));

  socket.on('send_message', async (data) => {
    try {
      const { roomId, text, senderName, senderColor, type, fileUrl, fileName, fileSize } = data;
      const msg = await Message.create({ roomId, senderId: uid, senderName, senderColor, text: text||'', type: type||'text', fileUrl, fileName, fileSize });
      await Promise.all([
        DM.findOneAndUpdate({ roomId }, { lastMsg: text||fileName||'File', lastAt: new Date() }),
        Clique.findByIdAndUpdate(roomId, { lastMsg: text||fileName||'File', lastAt: new Date() })
      ]);
      io.to(roomId).emit('new_message', msg);

      // Push notification to offline members
      const [dm, clique] = await Promise.all([DM.findOne({ roomId }), Clique.findById(roomId)]);
      const members = dm?.members || clique?.members || [];
      for (const memberId of members) {
        if (memberId.toString() !== uid) {
          const memberSocket = onlineUsers.get(memberId.toString());
          if (!memberSocket) await sendPush(memberId, `New message from ${senderName}`, text||'Sent a file', { roomId });
        }
      }
    } catch (e) { socket.emit('error', e.message); }
  });

  socket.on('react', async ({ msgId, emoji }) => {
    try {
      const msg = await Message.findByIdAndUpdate(msgId, { $inc: { [`reactions.${emoji}`]: 1 } }, { new: true });
      io.to(msg.roomId).emit('message_updated', msg);
    } catch (e) { socket.emit('error', e.message); }
  });

  socket.on('typing',       ({ roomId, isTyping }) => socket.to(roomId).emit('typing', { userId: uid, isTyping }));
  socket.on('call_offer',   (data) => socket.to(data.to).emit('call_offer',   { ...data, from: uid }));
  socket.on('call_answer',  (data) => socket.to(data.to).emit('call_answer',  { ...data, from: uid }));
  socket.on('call_ice',     (data) => socket.to(data.to).emit('call_ice',     { ...data, from: uid }));
  socket.on('call_end',     (data) => socket.to(data.to).emit('call_end',     { from: uid }));
  socket.on('call_reject',  (data) => socket.to(data.to).emit('call_reject',  { from: uid }));

  socket.on('disconnect', async () => {
    onlineUsers.delete(uid);
    await User.findByIdAndUpdate(uid, { online: false, lastSeen: new Date() });
    io.emit('presence', { userId: uid, online: false });
  });
});

// ── SERVE FRONTEND ────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Meno v2 running on http://localhost:${PORT}`));
