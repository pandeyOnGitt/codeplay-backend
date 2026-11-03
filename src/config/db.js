const mongoose = require('mongoose');

let connecting;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set (add it in Vercel Environment Variables)');

  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connecting) return connecting;

  mongoose.set('strictQuery', true);
  connecting = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  }).then((conn) => {
    console.log(`MongoDB connected: ${conn.connection.name}`);
    return conn;
  }).finally(() => {
    connecting = null;
  });

  return connecting;
}

module.exports = { connectDB };
