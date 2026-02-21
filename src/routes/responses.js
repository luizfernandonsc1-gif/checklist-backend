const router = require('express').Router();
const ctrl = require('../controllers/responseController');
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');

router.use(auth);

router.get('/all', authorize('admin'), ctrl.listAll);
router.get('/my', authorize('loja'), ctrl.listMine);
router.get('/:checklistId/mine', authorize('loja'), ctrl.getMyResponse);
router.post('/:checklistId/save', authorize('loja'), ctrl.save);
router.post('/:checklistId/complete', authorize('loja'), ctrl.complete);

module.exports = router;
