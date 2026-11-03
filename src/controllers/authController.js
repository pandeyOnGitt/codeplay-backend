const User = require('../models/User');
const Progress = require('../models/Progress');
const { signToken } = require('../utils/tokens');

function loginQuery(identifier) {
  const raw = String(identifier || '').trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  const lower = raw.toLowerCase();
  return {
    $or: [
      { username: upper },
      { email: lower },
    ],
  };
}

async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    const emailNorm = email.toLowerCase().trim();

    const exists = await User.findOne({ email: emailNorm });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email: emailNorm, password, role: 'user' });
    await Progress.createForUser(user);

    user.lastLoginAt = new Date();
    user.loginCount = 1;
    await user.save();

    const token = signToken(user._id);
    return res.status(201).json({
      success: true,
      message: 'Account created',
      token,
      user: user.toSafeJSON(),
    });
  } catch (err) {
    console.error('register:', err);
    return res.status(500).json({ success: false, message: err.message || 'Registration failed' });
  }
}

async function login(req, res) {
  try {
    const identifier = req.body.username || req.body.email || req.body.login;
    const { password } = req.body;
    const query = loginQuery(identifier);
    if (!query || !password) {
      return res.status(400).json({ success: false, message: 'Student ID / email and password are required' });
    }

    const user = await User.findOne(query).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid student ID or password' });
    }

    user.lastLoginAt = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    let progress = await Progress.findOne({ user: user._id });
    if (!progress) progress = await Progress.createForUser(user);

    const token = signToken(user._id);
    return res.json({
      success: true,
      message: 'Logged in',
      token,
      user: user.toSafeJSON(),
      progress: progress.toClientState(),
    });
  } catch (err) {
    console.error('login:', err);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
}

async function me(req, res) {
  try {
    const progress = await Progress.findOne({ user: req.user._id });
    return res.json({
      success: true,
      user: req.user.toSafeJSON(),
      progress: progress ? progress.toClientState() : Progress.emptyClientState(req.user._id.toString(), req.user.name),
    });
  } catch (err) {
    console.error('me:', err);
    return res.status(500).json({ success: false, message: 'Could not load profile' });
  }
}

async function updateProfile(req, res) {
  try {
    const { name } = req.body;
    if (name != null) {
      req.user.name = name.trim();
      await req.user.save();
      await Progress.findOneAndUpdate(
        { user: req.user._id },
        { $set: { 'profile.name': req.user.name } }
      );
    }
    return res.json({ success: true, user: req.user.toSafeJSON() });
  } catch (err) {
    console.error('updateProfile:', err);
    return res.status(500).json({ success: false, message: 'Could not update profile' });
  }
}

module.exports = { register, login, me, updateProfile };
