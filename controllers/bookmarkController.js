const User = require('../models/User');
const Vehicle = require('../models/Vehicle');

exports.getBookmarks = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('bookmarks').lean();
    res.json(user.bookmarks || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addBookmark = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.vehicleId);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { bookmarks: req.params.vehicleId } },
      { new: true }
    );
    res.json({ bookmarks: user.bookmarks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.removeBookmark = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { bookmarks: req.params.vehicleId } },
      { new: true }
    );
    res.json({ bookmarks: user.bookmarks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
