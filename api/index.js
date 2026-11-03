const app = require('../src/app');
const { connectDB } = require('../src/config/db');

let ready;

async function ensureReady() {
  if (!ready) {
    ready = connectDB().catch((err) => {
      ready = null;
      throw err;
    });
  }
  await ready;
}

module.exports = async (req, res) => {
  try {
    await ensureReady();
    return app(req, res);
  } catch (err) {
    console.error('Vercel handler failed:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      message: err.message || 'Server failed to start',
    }));
  }
};
