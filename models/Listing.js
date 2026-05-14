const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    variant: { type: String, default: '' },
    body_type: { type: String, default: '' },
    fuel_type: { type: String, default: '' },
    engine_capacity: { type: String, default: '' },
    transmission: { type: String, default: '' },
    color: { type: String, default: '' },
    assembly: { type: String, default: 'Local' },
    province: { type: String, default: '' },
    mileage_km: { type: Number, default: null },
    condition: { type: String, default: 'Used' },
    price_pkr: { type: Number, required: true },
    description: { type: String, default: '' },
    features: [{ type: String }],
    images: [{ type: String }],
    status: { type: String, enum: ['active', 'removed'], default: 'active' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Listing', listingSchema);
