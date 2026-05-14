const mongoose = require('mongoose');

const searchLogSchema = new mongoose.Schema({
  query: { type: String, required: true },
  matched: { type: Boolean, default: false },
  ai_triggered: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SearchLog', searchLogSchema);
