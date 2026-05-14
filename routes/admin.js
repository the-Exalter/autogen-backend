const router = require('express').Router();
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const ctrl = require('../controllers/adminController');

router.use(auth, adminOnly);

router.get('/stats', ctrl.getStats);
router.get('/users', ctrl.getUsers);
router.patch('/users/:id/ban', ctrl.banUser);
router.get('/cache', ctrl.getAICache);
router.delete('/cache/:id', ctrl.deleteAICacheEntry);
router.get('/vehicles', ctrl.getAllVehicles);
router.patch('/vehicles/:id/feature', ctrl.featureVehicle);
router.delete('/vehicles/:id', ctrl.deleteVehicle);
router.get('/prediction-logs', ctrl.getPredictionLogs);
router.get('/search-logs', ctrl.getSearchLogs);
router.get('/listings', ctrl.getAllListings);
router.delete('/listings/:id', ctrl.deleteListing);
router.get('/contacts', ctrl.getContacts);
router.patch('/contacts/:id/read', ctrl.markContactRead);

module.exports = router;
