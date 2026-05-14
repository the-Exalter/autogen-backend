const Vehicle = require('../models/Vehicle');

exports.purgeStaleAICache = async () => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const result = await Vehicle.deleteMany({
    source: 'ai_generated',
    search_count: { $lt: 3 },
    created_at: { $lt: sevenDaysAgo },
  });
  return result.deletedCount;
};
