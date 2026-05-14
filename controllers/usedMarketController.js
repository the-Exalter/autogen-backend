const axios = require('axios');
const Vehicle = require('../models/Vehicle');

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

exports.findUsedListings = async (req, res) => {
  try {
    const { vehicleId, location } = req.body;
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    // Return cached used market data if fresh (< 3 days)
    if (
      vehicle.used_market_data &&
      vehicle.used_market_data.cached_at &&
      Date.now() - new Date(vehicle.used_market_data.cached_at).getTime() < THREE_DAYS_MS
    ) {
      return res.json(vehicle.used_market_data);
    }

    const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

    let data;
    try {
      const response = await axios.post(
        `${aiUrl}/detect-availability`,
        {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          country: location.country,
          city: location.city,
          instruction: 'Search for used market listings only, not new dealership stock',
        },
        { timeout: 30000 }
      );
      data = response.data;
    } catch (err) {
      return res.status(503).json({ error: 'Used market search service unavailable' });
    }

    if (data.found === false) {
      return res.json({ found: false, suggest_international: true });
    }

    vehicle.used_market_data = { ...data, cached_at: new Date() };
    await vehicle.save();

    res.json(vehicle.used_market_data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
