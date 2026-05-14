const axios = require('axios');
const MLPredictionLog = require('../models/MLPredictionLog');

exports.predict = async (req, res) => {
  try {
    const features = req.body;
    const required = ['make', 'model', 'year', 'mileage_km', 'fuel_type', 'transmission', 'engine_capacity', 'body_type'];
    const missing = required.filter((k) => !features[k]);
    if (missing.length) return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });

    const market = features.market || 'pakistan';

    const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const { data } = await axios.post(
      `${aiUrl}/predict-price`,
      { ...features, market },
      { timeout: 15000 }
    );

    const predictedPrice = data.predicted_price_pkr ?? data.predicted_price_usd;

    await MLPredictionLog.create({
      input_features: features,
      predicted_price: predictedPrice,
      market,
      confidence_range: data.confidence_range,
    });

    res.json(data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'ML service unavailable' });
    }
    res.status(500).json({ error: err.message });
  }
};
