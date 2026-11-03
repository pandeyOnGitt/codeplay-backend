const User = require('../models/User');
const Progress = require('../models/Progress');

/** GET /api/admin/users — all registered users with progress summary */
async function listUsers(req, res) {
  try {
    const users = await User.find().sort({ lastLoginAt: -1, createdAt: -1 }).lean();
    const ids = users.map((u) => u._id);
    const progresses = await Progress.find({ user: { $in: ids } }).select('user xp completedLessons').lean();
    const byUser = new Map(progresses.map((p) => [p.user.toString(), p]));

    const list = users.map((u) => {
      const prog = byUser.get(u._id.toString());
      const completed = prog?.completedLessons
        ? (prog.completedLessons instanceof Map
          ? prog.completedLessons.size
          : Object.keys(prog.completedLessons || {}).length)
        : 0;
      return {
        id: u._id.toString(),
        name: u.name,
        username: u.username || null,
        email: u.email || null,
        role: u.role,
        lastLoginAt: u.lastLoginAt,
        loginCount: u.loginCount || 0,
        createdAt: u.createdAt,
        xp: prog?.xp ?? 0,
        lessonsCompleted: completed,
      };
    });

    return res.json({ success: true, count: list.length, users: list });
  } catch (err) {
    console.error('listUsers:', err);
    return res.status(500).json({ success: false, message: 'Could not list users' });
  }
}

/** DELETE /api/admin/users/:id — remove a user and their progress */
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    if (id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account' });
    }

    const target = await User.findById(id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (target.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot delete the last admin' });
      }
    }

    await Progress.deleteOne({ user: target._id });
    await User.deleteOne({ _id: target._id });

    return res.json({
      success: true,
      message: `Removed ${target.name} (${target.email})`,
      deletedId: id,
    });
  } catch (err) {
    console.error('deleteUser:', err);
    return res.status(500).json({ success: false, message: 'Could not delete user' });
  }
}

module.exports = { listUsers, deleteUser };
