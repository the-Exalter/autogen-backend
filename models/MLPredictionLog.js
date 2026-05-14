const mongoose = require('mongoose');

const mlPredictionLogSchema = new mongoose.Schema({
  input_features: { type: mongoose.Schema.Types.Mixed, required: true },
  predicted_price: { type: Number, required: true },
  market: { type: String, default: 'pakistan' },
  confidence_range: {
    min: { type: Number },
    max: { type: Number },
  },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('MLPredictionLog', mlPredictionLogSchema);
