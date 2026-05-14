const router = require('express').Router();
const ctrl = require('../controllers/vehicleController');

router.get('/', ctrl.listVehicles);
router.get('/suggestions', ctrl.getSuggestions);
router.get('/:id', ctrl.getVehicle);
router.post('/ai-search', ctrl.aiSearch);
router.post('/ai-search-stream', ctrl.streamAiSearch);
router.patch('/:id/search-count', ctrl.incrementSearchCount);

module.exports = router;
