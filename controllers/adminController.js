const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const Listing = require('../models/Listing');
const SearchLog = require('../models/SearchLog');
const MLPredictionLog = require('../models/MLPredictionLog');
const ContactSubmission = require('../models/ContactSubmission');

exports.getStats = async (req, res) => {
  try {
    const [totalVehicles, totalUsers, totalListings, aiCacheSize, totalPredictions] = await Promise.all([
      Vehicle.countDocuments({ source: 'db' }),
      User.countDocuments(),
      Listing.countDocuments({ status: 'active' }),
      Vehicle.countDocuments({ source: 'ai_generated' }),
      MLPredictionLog.countDocuments(),
    ]);

    const topSearches = await SearchLog.aggregate([
      { $group: { _id: '$query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const aiTriggerRate = await SearchLog.aggregate([
      { $group: { _id: null, total: { $sum: 1 }, ai: { $sum: { $cond: ['$ai_triggered', 1, 0] } } } },
    ]);

    res.json({
      totalVehicles,
      totalUsers,
      totalListings,
      aiCacheSize,
      totalPredictions,
      topSearches,
      aiTriggerRate: aiTriggerRate[0] || { total: 0, ai: 0 },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password_hash').lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.banUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.is_banned = !user.is_banned;
    await user.save();
    res.json({ id: user._id, is_banned: user.is_banned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAICache = async (req, res) => {
  try {
    const cache = await Vehicle.find({ source: 'ai_generated' })
      .sort({ search_count: -1 })
      .lean();
    res.json(cache);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAICacheEntry = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndDelete({ _id: req.params.id, source: 'ai_generated' });
    if (!vehicle) return res.status(404).json({ error: 'Cache entry not found' });
    res.json({ message: 'Cache entry deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.featureVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    vehicle.is_featured = !vehicle.is_featured;
    await vehicle.save();
    res.json({ id: vehicle._id, is_featured: vehicle.is_featured });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPredictionLogs = async (req, res) => {
  try {
    const logs = await MLPredictionLog.find().sort({ timestamp: -1 }).limit(100).lean();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSearchLogs = async (req, res) => {
  try {
    const logs = await SearchLog.find().sort({ timestamp: -1 }).limit(200).lean();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllListings = async (req, res) => {
  try {
    const listings = await Listing.find()
      .populate('user_id', 'name email')
      .sort({ created_at: -1 })
      .lean();
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findByIdAndUpdate(req.params.id, { status: 'removed' });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json({ message: 'Listing removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find().limit(200).sort({ created_at: -1 }).lean();
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    const v = await Vehicle.findByIdAndDelete(req.params.id);
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const contacts = await ContactSubmission.find().sort({ submitted_at: -1 }).lean();
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markContactRead = async (req, res) => {
  try {
    const contact = await ContactSubmission.findById(req.params.id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    contact.is_read = true;
    await contact.save();
    res.json({ id: contact._id, is_read: contact.is_read });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
