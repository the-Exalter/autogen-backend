require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');

const SELLERS = [
  { name: 'James Mitchell',  city: 'Los Angeles, CA', phone: '+1-310-555-0182' },
  { name: 'Sarah Chen',      city: 'New York, NY',    phone: '+1-212-555-0147' },
  { name: 'Mike Rodriguez',  city: 'Houston, TX',     phone: '+1-713-555-0293' },
  { name: 'Emily Johnson',   city: 'Chicago, IL',     phone: '+1-312-555-0164' },
  { name: 'David Kim',       city: 'Seattle, WA',     phone: '+1-206-555-0318' },
  { name: 'Ashley Williams', city: 'Miami, FL',       phone: '+1-305-555-0227' },
  { name: 'Robert Taylor',   city: 'Denver, CO',      phone: '+1-720-555-0195' },
  { name: 'Jennifer Lee',    city: 'Phoenix, AZ',     phone: '+1-602-555-0341' },
  { name: 'Chris Anderson',  city: 'Portland, OR',    phone: '+1-503-555-0156' },
  { name: 'Amanda Davis',    city: 'Austin, TX',      phone: '+1-512-555-0284' },
];

const BODY_TYPE_IMAGES = {
  'Sedan': [
    'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800',
    'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800',
    'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800',
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800',
  ],
  'Pickup': [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    'https://images.unsplash.com/photo-1571987502227-9231b837d92a?w=800',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800',
  ],
  'SUV': [
    'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800',
    'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800',
    'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=800',
  ],
};

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800',
  'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800',
];

const VEHICLES = [
  { make: 'Toyota', model: 'Corolla', years: [2018,2019,2020,2021,2022], basePriceUsd: 18000 },
  { make: 'Honda',  model: 'Civic',   years: [2018,2019,2020,2021,2022], basePriceUsd: 19500 },
  { make: 'Honda',  model: 'Accord',  years: [2017,2018,2019,2020,2021], basePriceUsd: 22000 },
  { make: 'Toyota', model: 'Camry',   years: [2018,2019,2020,2021,2022], basePriceUsd: 21000 },
  { make: 'Ford',   model: 'F-150',   years: [2018,2019,2020,2021,2022], basePriceUsd: 35000 },
  { make: 'Honda',  model: 'CR-V',    years: [2018,2019,2020,2021,2022], basePriceUsd: 24000 },
  { make: 'Toyota', model: 'RAV4',    years: [2018,2019,2020,2021,2022], basePriceUsd: 25000 },
  { make: 'Nissan', model: 'Altima',  years: [2018,2019,2020,2021,2022], basePriceUsd: 17000 },
  { make: 'Ford',   model: 'Escape',  years: [2018,2019,2020,2021,2022], basePriceUsd: 20000 },
];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function roundTo(val, nearest) {
  return Math.round(val / nearest) * nearest;
}

function bodyType(model) {
  if (model === 'F-150') return 'Pickup';
  if (['CR-V', 'RAV4', 'Escape'].includes(model)) return 'SUV';
  return 'Sedan';
}

function getImages(bodyType) {
  const pool = BODY_TYPE_IMAGES[bodyType] || DEFAULT_IMAGES;
  return [pool[Math.floor(Math.random() * pool.length)]];
}

function makeListing(spec) {
  const year    = pick(spec.years);
  const seller  = pick(SELLERS);
  const age     = 2026 - year;

  const mileageKm = roundTo(age * rand(12000, 18000) * 1.609, 100);

  const condition = age <= 2 ? 'Excellent' : age <= 4 ? 'Good' : 'Fair';

  const priceUsd = roundTo(
    spec.basePriceUsd * Math.pow(1 - 0.148, age) * rand(0.9, 1.1),
    100
  );

  const transmission = Math.random() < 0.8 ? 'Automatic' : 'Manual';

  return {
    make:         spec.make,
    model:        spec.model,
    year,
    variant:      '',
    body_type:    bodyType(spec.model),
    fuel_type:    'Petrol',
    transmission,
    condition,
    mileage_km:   mileageKm,
    price_usd:    priceUsd,
    price_pkr:    null,
    seller_name:  seller.name,
    seller_city:  seller.city,
    seller_phone: seller.phone,
    province:     seller.city,
    assembly:     'USA',
    source:       'user_listing',
    search_count: 0,
    is_featured:  false,
    images:       getImages(bodyType(spec.model)),
    features:     [],
    description:  '',
  };
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  await Vehicle.deleteMany({ source: 'user_listing' });
  console.log('Cleared existing used listings');

  let totalSeeded = 0;

  for (const spec of VEHICLES) {
    const docs = Array.from({ length: 8 }, () => makeListing(spec));
    await Vehicle.insertMany(docs);
    totalSeeded += 8;
    console.log(`[${spec.make} ${spec.model}] Seeded 8 listings`);
  }

  console.log('\n=== Mock Listings Complete ===');
  console.log(`Total seeded: ${totalSeeded} listings`);

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
