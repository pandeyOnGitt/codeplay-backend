const mongoose = require('mongoose');

/** Mirrors codeplay/src/lib/storage.js emptyState() — one document per user. */
const SCHEMA_VERSION = 1;

const xpLogEntrySchema = new mongoose.Schema(
  {
    at: { type: Number, required: true },
    amount: { type: Number, required: true },
    reason: { type: String, default: '' },
  },
  { _id: false }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    at: { type: Number, required: true },
  },
  { _id: false }
);

const mockResultSchema = new mongoose.Schema(
  {
    id: String,
    kind: String,
    title: String,
    score: Number,
    total: Number,
    at: { type: Number, required: true },
    perTopic: { type: Map, of: [Number], default: undefined },
  },
  { _id: false, strict: false }
);

const experimentSchema = new mongoose.Schema(
  {
    done: Number,
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    done: Number,
  },
  { _id: false }
);

const progressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    version: { type: Number, default: SCHEMA_VERSION },
    profile: {
      name: { type: String, default: '' },
      createdAt: { type: Number, default: () => Date.now() },
      userId: { type: String, default: null },
    },
    xp: { type: Number, default: 0, min: 0 },
    xpLog: { type: [xpLogEntrySchema], default: [] },
    /** 'YYYY-MM-DD' -> xp earned that day */
    activity: { type: Map, of: Number, default: {} },
    /** lessonId -> timestamp */
    completedLessons: { type: Map, of: Number, default: {} },
    visitedLessons: { type: Map, of: Number, default: {} },
    /** labId -> { done, data } */
    experiments: { type: Map, of: experimentSchema, default: {} },
    /** topicId -> [{ score, total, at }] */
    quizScores: { type: Map, of: [quizAttemptSchema], default: {} },
    mockResults: { type: [mockResultSchema], default: [] },
    /** challengeId -> timestamp */
    challenges: { type: Map, of: Number, default: {} },
    /** projectId -> { done } */
    projects: { type: Map, of: projectSchema, default: {} },
    /** missionId -> timestamp */
    missions: { type: Map, of: Number, default: {} },
    /** 'YYYY-MM-DD' -> true */
    daily: { type: Map, of: Boolean, default: {} },
    /** lessonId -> timestamp */
    bookmarks: { type: Map, of: Number, default: {} },
    /** lessonId -> timestamp */
    examNotesRead: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

function mapToObject(map) {
  if (!map) return {};
  if (map instanceof Map) return Object.fromEntries(map);
  if (typeof map === 'object') return { ...map };
  return {};
}

progressSchema.methods.toClientState = function toClientState() {
  const experiments = {};
  for (const [id, val] of Object.entries(mapToObject(this.experiments))) {
    experiments[id] = {
      done: val?.done,
      data: val?.data || {},
    };
  }

  const projects = {};
  for (const [id, val] of Object.entries(mapToObject(this.projects))) {
    projects[id] = { done: val?.done };
  }

  const quizScores = {};
  for (const [topic, attempts] of Object.entries(mapToObject(this.quizScores))) {
    quizScores[topic] = Array.isArray(attempts) ? attempts : [];
  }

  return {
    version: this.version,
    profile: {
      name: this.profile?.name || '',
      createdAt: this.profile?.createdAt || Date.now(),
      userId: this.user.toString(),
    },
    xp: this.xp,
    xpLog: this.xpLog || [],
    activity: mapToObject(this.activity),
    completedLessons: mapToObject(this.completedLessons),
    visitedLessons: mapToObject(this.visitedLessons),
    experiments,
    quizScores,
    mockResults: this.mockResults || [],
    challenges: mapToObject(this.challenges),
    projects,
    missions: mapToObject(this.missions),
    daily: mapToObject(this.daily),
    bookmarks: mapToObject(this.bookmarks),
    examNotesRead: mapToObject(this.examNotesRead),
  };
};

progressSchema.statics.createForUser = async function createForUser(user) {
  return this.create({
    user: user._id,
    profile: {
      name: user.name || '',
      createdAt: Date.now(),
      userId: user._id.toString(),
    },
  });
};

progressSchema.statics.emptyClientState = function emptyClientState(userId, name = '') {
  return {
    version: SCHEMA_VERSION,
    profile: { name, createdAt: Date.now(), userId: userId || null },
    xp: 0,
    xpLog: [],
    activity: {},
    completedLessons: {},
    visitedLessons: {},
    experiments: {},
    quizScores: {},
    mockResults: [],
    challenges: {},
    projects: {},
    missions: {},
    daily: {},
    bookmarks: {},
    examNotesRead: {},
  };
};

module.exports = mongoose.model('Progress', progressSchema);
module.exports.SCHEMA_VERSION = SCHEMA_VERSION;
