const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Progress = require('../models/Progress');
const students = require('../data/students');

function titleCase(full) {
  return String(full)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function firstNamePassword(full) {
  return String(full).trim().split(/\s+/)[0].toLowerCase();
}

/**
 * Ensure roster students exist.
 * Uses upsert by username/email to avoid duplicate-key races.
 */
async function seedStudents({ resetPasswords = false } = {}) {
  let created = 0;
  let updated = 0;

  for (const [id, fullName] of students) {
    const username = id.toUpperCase().trim();
    const email = `${username.toLowerCase()}@student.codeplay.local`;
    const name = titleCase(fullName);
    const passwordPlain = firstNamePassword(fullName);

    let user = await User.findOne({ $or: [{ username }, { email }] }).select('+password');

    if (!user) {
      try {
        user = await User.create({
          username,
          email,
          name,
          password: passwordPlain,
          role: 'user',
        });
        created += 1;
      } catch (err) {
        if (err?.code === 11000) {
          user = await User.findOne({ $or: [{ username }, { email }] }).select('+password');
          if (!user) throw err;
          updated += 1;
        } else {
          throw err;
        }
      }
    } else {
      user.username = username;
      user.email = email;
      user.name = name;
      user.role = 'user';
      if (resetPasswords) user.password = passwordPlain;
      await user.save();
      updated += 1;
    }

    const hasProgress = await Progress.exists({ user: user._id });
    if (!hasProgress) await Progress.createForUser(user);
  }

  console.log(`Students seeded: ${created} created, ${updated} updated, ${students.length} total in roster`);
  return { created, updated, total: students.length };
}

module.exports = { seedStudents, firstNamePassword, titleCase };
