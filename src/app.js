require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const progressRoutes = require('./routes/progress');
const adminRoutes = require('./routes/admin');

const app = express();

function normalizeOrigin(url) {
  return String(url || '').trim().replace(/\/$/, '');
}

function corsOrigin(origin, cb) {
  const allowed = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  // Allow non-browser / same-origin tools (no Origin header)
  if (!origin) return cb(null, true);
  const incoming = normalizeOrigin(origin);
  if (allowed.includes('*') || allowed.includes(incoming)) return cb(null, true);
  return cb(null, false);
}

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/', (_req, res) => {
  res.json({
    success: true,
    service: 'codeplay-backend',
    health: '/api/health',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ success: true, service: 'codeplay-backend', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server error',
  });
});

module.exports = app;
