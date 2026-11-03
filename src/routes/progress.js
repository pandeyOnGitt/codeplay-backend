const express = require('express');
const { protect } = require('../middleware/auth');
const {
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
} = require('../controllers/progressController');

const router = express.Router();

router.use(protect);

router.get('/', getProgress);
router.put('/', saveProgress);
router.patch('/', patchProgress);
router.delete('/', resetProgress);

router.post('/xp', addXp);
router.post('/complete-lesson', completeLesson);
router.post('/complete-experiment', completeExperiment);
router.post('/complete-project', completeProject);
router.post('/complete-mission', completeMission);
router.post('/quiz', recordQuiz);
router.post('/mock', recordMock);

module.exports = router;
