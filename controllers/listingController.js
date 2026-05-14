const Listing = require('../models/Listing');

exports.getListings = async (req, res) => {
  try {
    const listings = await Listing.find({ status: 'active' })
      .populate('user_id', 'name email')
      .sort({ created_at: -1 })
      .lean();
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createListing = async (req, res) => {
  try {
    const {
      make, model, year, variant, body_type, fuel_type,
      engine_capacity, transmission, color, assembly, province,
      mileage_km, condition, price_pkr, description, features, images,
    } = req.body;

    if (!make || !model || !year || !price_pkr)
      return res.status(400).json({ error: 'make, model, year, and price_pkr required' });

    const listing = await Listing.create({
      user_id: req.user.id,
      make, model, year: Number(year), variant, body_type, fuel_type,
      engine_capacity, transmission, color, assembly, province,
      mileage_km: mileage_km ? Number(mileage_km) : null,
      condition,
      price_pkr: Number(price_pkr),
      description,
      features: features || [],
      images: images || [],
    });

    res.status(201).json(listing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const isOwner = listing.user_id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    listing.status = 'removed';
    await listing.save();
    res.json({ message: 'Listing removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
