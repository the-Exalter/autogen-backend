const router = require('express').Router();
const Vehicle = require('../models/Vehicle');

router.get('/', async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ error: 'ids query param required' });

    const idList = ids.split(',').slice(0, 3);
    const vehicles = await Vehicle.find({ _id: { $in: idList } }).lean();
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
