const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    make: { type: String, required: true, index: true },
    model: { type: String, required: true, index: true },
    year: { type: Number, required: true, index: true },
    variant: { type: String, default: '' },
    body_type: { type: String, default: '' },
    fuel_type: { type: String, default: '' },
    engine_capacity: { type: String, default: '' },
    transmission: { type: String, default: '' },
    color: { type: String, default: '' },
    assembly: { type: String, default: '' },
    province: { type: String, default: '' },
    mileage_km: { type: Number, default: null },
    condition: { type: String, default: 'Used' },
    price_pkr: { type: Number, default: null },
    price_usd: { type: Number, default: null },
    seller_name: { type: String, default: '' },
    seller_city: { type: String, default: '' },
    seller_phone: { type: String, default: '' },
    features: [{ type: String }],
    images: [{ type: String }],
    description: { type: String, default: '' },
    is_listed_by_user: { type: Boolean, default: false },
    source: {
      type: String,
      enum: ['db', 'ai_generated', 'user_listing'],
      default: 'db',
    },
    search_count: { type: Number, default: 0 },
    ai_generated_at: { type: Date, default: null },
    expires_at: { type: Date, default: null },
    is_featured: { type: Boolean, default: false },
    ad_reference: { type: String, default: '' },
    known_issues: [{ type: String }],
    maintenance_intervals: { type: mongoose.Schema.Types.Mixed, default: null },
    parts_availability: { type: String, default: '' },
    buying_checklist: [{ type: String }],
    market_position: { type: String, default: '' },
    used_market_data: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

vehicleSchema.index({ make: 'text', model: 'text', variant: 'text' });
vehicleSchema.index({ source: 1, expires_at: 1 });
vehicleSchema.index({ is_featured: 1 });
vehicleSchema.index({ source: 1, search_count: 1, created_at: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
