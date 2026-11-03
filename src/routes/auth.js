const express = require('express');
const { body } = require('express-validator');
const { login, me, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.post('/register', (_req, res) => {
  res.status(403).json({ success: false, message: 'Sign up is disabled. Use your Student ID to log in.' });
});

router.post(
  '/login',
  [
    body('password').notEmpty().withMessage('Password is required'),
    body().custom((_, { req }) => {
      if (!req.body.username && !req.body.email && !req.body.login) {
        throw new Error('Student ID or email is required');
      }
      return true;
    }),
  ],
  validate,
  login
);

router.get('/me', protect, me);
router.patch(
  '/me',
  protect,
  [body('name').optional().trim().notEmpty().isLength({ max: 120 })],
  validate,
  updateProfile
);

module.exports = router;
