require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./config/db');
const { seedAdmin } = require('./utils/seedAdmin');
const { seedStudents } = require('./utils/seedStudents');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  await seedAdmin();
  // Full roster seed is heavy — only on local/dev unless explicitly enabled
  if (process.env.SEED_STUDENTS === 'true' || process.env.NODE_ENV !== 'production') {
    await seedStudents();
  }
  app.listen(PORT, () => {
    console.log(`CodePlay API listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
