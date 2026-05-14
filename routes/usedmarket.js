const router = require('express').Router();
const auth = require('../middleware/auth');
const { findUsedListings } = require('../controllers/usedMarketController');

router.post('/', auth, findUsedListings);

module.exports = router;
