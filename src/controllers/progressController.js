const Progress = require('../models/Progress');

async function getOrCreate(user) {
  let progress = await Progress.findOne({ user: user._id });
  if (!progress) progress = await Progress.createForUser(user);
  return progress;
}

/** GET /api/progress — full state for the logged-in user */
async function getProgress(req, res) {
  try {
    const progress = await getOrCreate(req.user);
    return res.json({ success: true, progress: progress.toClientState() });
  } catch (err) {
    console.error('getProgress:', err);
    return res.status(500).json({ success: false, message: 'Could not load progress' });
  }
}

/**
 * PUT /api/progress — replace entire state (same shape as frontend emptyState).
 * Used when syncing from the client adapter.
 */
async function saveProgress(req, res) {
  try {
    const body = req.body || {};
    const progress = await getOrCreate(req.user);

    progress.version = body.version ?? progress.version;
    progress.profile = {
      name: body.profile?.name ?? progress.profile?.name ?? req.user.name,
      createdAt: body.profile?.createdAt ?? progress.profile?.createdAt ?? Date.now(),
      userId: req.user._id.toString(),
    };
    progress.xp = typeof body.xp === 'number' ? body.xp : progress.xp;
    progress.xpLog = Array.isArray(body.xpLog) ? body.xpLog.slice(-200) : progress.xpLog;
    progress.activity = body.activity ?? mapToMap(progress.activity);
    progress.completedLessons = body.completedLessons ?? mapToMap(progress.completedLessons);
    progress.visitedLessons = body.visitedLessons ?? mapToMap(progress.visitedLessons);
    progress.experiments = body.experiments ?? mapToMap(progress.experiments);
    progress.quizScores = body.quizScores ?? mapToMap(progress.quizScores);
    progress.mockResults = Array.isArray(body.mockResults) ? body.mockResults : progress.mockResults;
    progress.challenges = body.challenges ?? mapToMap(progress.challenges);
    progress.projects = body.projects ?? mapToMap(progress.projects);
    progress.missions = body.missions ?? mapToMap(progress.missions);
    progress.daily = body.daily ?? mapToMap(progress.daily);
    progress.bookmarks = body.bookmarks ?? mapToMap(progress.bookmarks);
    progress.examNotesRead = body.examNotesRead ?? mapToMap(progress.examNotesRead);

    await progress.save();
    return res.json({ success: true, progress: progress.toClientState() });
  } catch (err) {
    console.error('saveProgress:', err);
    return res.status(500).json({ success: false, message: 'Could not save progress' });
  }
}

/** PATCH /api/progress — merge partial updates */
async function patchProgress(req, res) {
  try {
    const body = req.body || {};
    const progress = await getOrCreate(req.user);
    const mergeable = [
      'xp', 'xpLog', 'activity', 'completedLessons', 'visitedLessons',
      'experiments', 'quizScores', 'mockResults', 'challenges', 'projects',
      'missions', 'daily', 'bookmarks', 'examNotesRead', 'version',
    ];

    for (const key of mergeable) {
      if (body[key] === undefined) continue;
      if (key === 'xp' || key === 'version') {
        progress[key] = body[key];
      } else if (key === 'xpLog' || key === 'mockResults') {
        progress[key] = body[key];
      } else if (typeof body[key] === 'object' && body[key] !== null) {
        const current = mapToObject(progress[key]);
        progress[key] = { ...current, ...body[key] };
      }
    }

    if (body.profile) {
      progress.profile = {
        ...mapToObject(progress.profile),
        ...body.profile,
        userId: req.user._id.toString(),
      };
    }

    await progress.save();
    return res.json({ success: true, progress: progress.toClientState() });
  } catch (err) {
    console.error('patchProgress:', err);
    return res.status(500).json({ success: false, message: 'Could not update progress' });
  }
}

/** POST /api/progress/xp — add XP entry */
async function addXp(req, res) {
  try {
    const amount = Number(req.body.amount);
    const reason = req.body.reason || '';
    if (!Number.isFinite(amount) || amount === 0) {
      return res.status(400).json({ success: false, message: 'amount must be a non-zero number' });
    }

    const progress = await getOrCreate(req.user);
    const now = Date.now();
    const day = new Date().toISOString().slice(0, 10);

    progress.xp = (progress.xp || 0) + amount;
    progress.xpLog = [...(progress.xpLog || []).slice(-199), { at: now, amount, reason }];

    const activity = mapToObject(progress.activity);
    activity[day] = (activity[day] || 0) + amount;
    progress.activity = activity;

    await progress.save();
    return res.json({ success: true, progress: progress.toClientState() });
  } catch (err) {
    console.error('addXp:', err);
    return res.status(500).json({ success: false, message: 'Could not add XP' });
  }
}

/** POST /api/progress/complete-lesson */
async function completeLesson(req, res) {
  try {
    const { lessonId, title } = req.body;
    if (!lessonId) return res.status(400).json({ success: false, message: 'lessonId required' });

    const progress = await getOrCreate(req.user);
    const completed = mapToObject(progress.completedLessons);
    if (completed[lessonId]) {
      return res.json({ success: true, alreadyDone: true, progress: progress.toClientState() });
    }

    completed[lessonId] = Date.now();
    progress.completedLessons = completed;
    await applyXp(progress, 50, `Lesson: ${title || lessonId}`);
    await progress.save();
    return res.json({ success: true, progress: progress.toClientState() });
  } catch (err) {
    console.error('completeLesson:', err);
    return res.status(500).json({ success: false, message: 'Could not complete lesson' });
  }
}

/** POST /api/progress/complete-experiment */
async function completeExperiment(req, res) {
  try {
    const { labId, title, data } = req.body;
    if (!labId) return res.status(400).json({ success: false, message: 'labId required' });

    const progress = await getOrCreate(req.user);
    const experiments = mapToObject(progress.experiments);
    const prev = experiments[labId] || {};
    if (prev.done) {
      return res.json({ success: true, alreadyDone: true, progress: progress.toClientState() });
    }

    experiments[labId] = { done: Date.now(), data: { ...(prev.data || {}), ...(data || {}) } };
    progress.experiments = experiments;
    await applyXp(progress, 30, `Experiment: ${title || labId}`);
    await progress.save();
    return res.json({ success: true, progress: progress.toClientState() });
  } catch (err) {
    console.error('completeExperiment:', err);
    return res.status(500).json({ success: false, message: 'Could not complete experiment' });
  }
}

/** POST /api/progress/complete-project */
async function completeProject(req, res) {
  try {
    const { projectId, title } = req.body;
    if (!projectId) return res.status(400).json({ success: false, message: 'projectId required' });

    const progress = await getOrCreate(req.user);
    const projects = mapToObject(progress.projects);
    if (projects[projectId]?.done) {
      return res.json({ success: true, alreadyDone: true, progress: progress.toClientState() });
    }

    projects[projectId] = { done: Date.now() };
    progress.projects = projects;
    await applyXp(progress, 150, `Project: ${title || projectId}`);
    await progress.save();
    return res.json({ success: true, progress: progress.toClientState() });
  } catch (err) {
    console.error('completeProject:', err);
    return res.status(500).json({ success: false, message: 'Could not complete project' });
  }
}

/** POST /api/progress/complete-mission */
async function completeMission(req, res) {
  try {
    const { missionId, title } = req.body;
    if (!missionId) return res.status(400).json({ success: false, message: 'missionId required' });

    const progress = await getOrCreate(req.user);
    const missions = mapToObject(progress.missions);
    if (missions[missionId]) {
      return res.json({ success: true, alreadyDone: true, progress: progress.toClientState() });
    }

    missions[missionId] = Date.now();
    progress.missions = missions;
    await applyXp(progress, 100, `Mission: ${title || missionId}`);
    await progress.save();
    return res.json({ success: true, progress: progress.toClientState() });
  } catch (err) {
    console.error('completeMission:', err);
    return res.status(500).json({ success: false, message: 'Could not complete mission' });
  }
}

/** POST /api/progress/quiz */
async function recordQuiz(req, res) {
  try {
    const { topic, score, total } = req.body;
    if (!topic || score == null || total == null) {
      return res.status(400).json({ success: false, message: 'topic, score, total required' });
    }

    const progress = await getOrCreate(req.user);
    const quizScores = mapToObject(progress.quizScores);
    const list = quizScores[topic] || [];
    list.push({ score: Number(score), total: Number(total), at: Date.now() });
    quizScores[topic] = list;
    progress.quizScores = quizScores;

    if (Number(score) > 0) await applyXp(progress, Number(score) * 10, `Quiz: ${topic}`);
    await progress.save();
    return res.json({ success: true, progress: progress.toClientState() });
  } catch (err) {
    console.error('recordQuiz:', err);
    return res.status(500).json({ success: false, message: 'Could not record quiz' });
  }
}

/** POST /api/progress/mock */
async function recordMock(req, res) {
  try {
    const result = req.body || {};
    const progress = await getOrCreate(req.user);
    progress.mockResults = [...(progress.mockResults || []), { ...result, at: Date.now() }];
    const score = Number(result.score) || 0;
    await applyXp(progress, Math.max(10, score * 5), `Mock test: ${result.title || 'mock'}`);
    await progress.save();
    return res.json({ success: true, progress: progress.toClientState() });
  } catch (err) {
    console.error('recordMock:', err);
    return res.status(500).json({ success: false, message: 'Could not record mock' });
  }
}

/** DELETE /api/progress — reset to empty state for this user */
async function resetProgress(req, res) {
  try {
    await Progress.findOneAndDelete({ user: req.user._id });
    const progress = await Progress.createForUser(req.user);
    return res.json({ success: true, progress: progress.toClientState() });
  } catch (err) {
    console.error('resetProgress:', err);
    return res.status(500).json({ success: false, message: 'Could not reset progress' });
  }
}

async function applyXp(progress, amount, reason) {
  const now = Date.now();
  const day = new Date().toISOString().slice(0, 10);
  progress.xp = (progress.xp || 0) + amount;
  progress.xpLog = [...(progress.xpLog || []).slice(-199), { at: now, amount, reason }];
  const activity = mapToObject(progress.activity);
  activity[day] = (activity[day] || 0) + amount;
  progress.activity = activity;
}

function mapToObject(map) {
  if (!map) return {};
  if (map instanceof Map) return Object.fromEntries(map);
  if (typeof map.toObject === 'function') return map.toObject();
  if (typeof map === 'object') return { ...map };
  return {};
}

function mapToMap(map) {
  return mapToObject(map);
}

module.exports = {
  getProgress,
  saveProgress,
  patchProgress,
  addXp,
  completeLesson,
  completeExperiment,
  completeProject,
  completeMission,
  recordQuiz,
  recordMock,
  resetProgress,
};
