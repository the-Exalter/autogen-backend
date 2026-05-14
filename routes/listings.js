const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/listingController');

router.get('/', ctrl.getListings);
router.post('/', auth, ctrl.createListing);
router.delete('/:id', auth, ctrl.deleteListing);

module.exports = router;
