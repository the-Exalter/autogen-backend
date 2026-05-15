const express = require('express');
const router = express.Router();
const axios = require('axios');
const Vehicle = require('../models/Vehicle');

const AI_URL = () => (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');

router.post('/', async (req, res) => {
  try {
    const { vehicleId, location } = req.body;

    const vehicle = await Vehicle.findById(vehicleId).lean();
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const response = await axios.post(
      `${AI_URL()}/find-used-listings`,
      {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year || null,
      },
      { timeout: 45000 }
    );

    return res.json(response.data);

  } catch (err) {
    console.error('[UsedMarket]', err.message);
    res.status(500).json({
      found: false,
      listings: [],
      error: err.message,
    });
  }
});

module.exports = router;
