const router = require('express').Router();
const ctrl = require('../controllers/checklistController');
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');

router.use(auth);

router.get('/lojas', authorize('admin'), ctrl.getLojas);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', authorize('admin'), ctrl.create);
router.put('/:id', authorize('admin'), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;
