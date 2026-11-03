const express = require('express');
const { protect, requireAdmin } = require('../middleware/auth');
const { listUsers, deleteUser } = require('../controllers/adminController');

const router = express.Router();

router.use(protect, requireAdmin);

router.get('/users', listUsers);
router.delete('/users/:id', deleteUser);

module.exports = router;
