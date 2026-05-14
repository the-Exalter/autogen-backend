const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/bookmarkController');

router.get('/', auth, ctrl.getBookmarks);
router.post('/:vehicleId', auth, ctrl.addBookmark);
router.delete('/:vehicleId', auth, ctrl.removeBookmark);

module.exports = router;
