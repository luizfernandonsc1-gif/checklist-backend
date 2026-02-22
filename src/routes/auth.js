const router = require('express').Router();
const { login, me, listUsers, createUser, updateUser, toggleUser } = require('../controllers/authController');
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');

router.post('/login', login);
router.get('/me', auth, me);

// Gestão de usuários — admin only
router.get('/users', auth, authorize('admin'), listUsers);
router.post('/users', auth, authorize('admin'), createUser);
router.put('/users/:id', auth, authorize('admin'), updateUser);
router.patch('/users/:id/toggle', auth, authorize('admin'), toggleUser);

module.exports = router;
