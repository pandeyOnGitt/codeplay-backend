const User = require('../models/User');
const Progress = require('../models/Progress');

/** Ensures a default admin account exists (from .env). */
async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@codeplay.local').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || 'admin123456';
  const name = process.env.ADMIN_NAME || 'Admin';

  let admin = await User.findOne({ email }).select('+password');
  if (!admin) {
    admin = await User.create({ name, email, password, role: 'admin' });
    await Progress.createForUser(admin);
    console.log(`Admin created: ${email}`);
    return;
  }

  if (admin.role !== 'admin') {
    admin.role = 'admin';
    await admin.save();
    console.log(`Existing user promoted to admin: ${email}`);
  }
}

module.exports = { seedAdmin };
