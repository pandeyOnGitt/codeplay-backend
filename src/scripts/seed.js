require('dotenv').config();
const { connectDB } = require('../config/db');
const { seedAdmin } = require('../utils/seedAdmin');
const { seedStudents } = require('../utils/seedStudents');
const User = require('../models/User');

(async () => {
  await connectDB();
  await seedAdmin();
  const reset = process.argv.includes('--reset-passwords');
  await seedStudents({ resetPasswords: reset });
  const count = await User.countDocuments({ role: 'user', username: { $ne: null } });
  console.log(`Done. Student accounts in DB: ${count}`);
  console.log(`Example login → username: BTAI2026049  password: gaurav`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
