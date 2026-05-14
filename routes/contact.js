const router = require('express').Router();
const { submitContact } = require('../controllers/contactController');

router.post('/', submitContact);

module.exports = router;
