require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle');

// ─── Price Cleaning ─────────────────────────────────────────────────────────

function cleanPrice(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.replace(/,/g, '').trim();

  const lacMatch = s.match(/PKR\s*([\d.]+)\s*lacs?/i);
  if (lacMatch) return Math.round(parseFloat(lacMatch[1]) * 100000);

  const croreMatch = s.match(/PKR\s*([\d.]+)\s*crore/i);
  if (croreMatch) return Math.round(parseFloat(croreMatch[1]) * 10000000);

  const numMatch = s.match(/[\d.]+/);
  if (numMatch) return Math.round(parseFloat(numMatch[0]));

  return null;
}

// ─── Mileage Cleaning ───────────────────────────────────────────────────────

function cleanMileage(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.replace(/,/g, '').trim();
  const match = s.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// ─── Features Parsing ───────────────────────────────────────────────────────

function parseFeatures(raw) {
  if (!raw || typeof raw !== 'string') return [];
  // Strip Python list syntax: ['ABS', 'Air Bags', ...]
  const cleaned = raw.replace(/^\[|\]$/g, '').trim();
  if (!cleaned) return [];
  return cleaned
    .split(',')
    .map((f) => f.replace(/['"]/g, '').trim())
    .filter(Boolean);
}

// ─── Make/Model Extraction ──────────────────────────────────────────────────

const KNOWN_MAKES = [
  'Toyota', 'Honda', 'Suzuki', 'Daihatsu', 'Hyundai', 'Kia', 'Nissan',
  'Mitsubishi', 'Mercedes', 'BMW', 'Audi', 'Ford', 'Chevrolet', 'Jeep',
  'Land Rover', 'Range Rover', 'Isuzu', 'Fiat', 'Subaru', 'Mazda',
  'Volkswagen', 'Changan', 'Proton', 'MG', 'BAIC', 'FAW', 'Haval',
  'Prince', 'United', 'Regal', 'Adam', 'Renault', 'Peugeot',
];

function extractMakeModel(nam) {
  if (!nam || typeof nam !== 'string') return { make: 'Unknown', model: 'Unknown', variant: '' };

  const trimmed = nam.trim();

  for (const make of KNOWN_MAKES) {
    if (trimmed.toLowerCase().startsWith(make.toLowerCase())) {
      const rest = trimmed.slice(make.length).trim();
      const parts = rest.split(' ');
      const model = parts[0] || 'Unknown';
      const variant = parts.slice(1).join(' ').replace(/\d{4}$/, '').trim();
      return { make, model, variant };
    }
  }

  // Fallback: first word = make, second = model
  const parts = trimmed.split(' ');
  return {
    make: parts[0] || 'Unknown',
    model: parts[1] || 'Unknown',
    variant: parts.slice(2).join(' ').replace(/\d{4}$/, '').trim(),
  };
}

// ─── Engine capacity normalise ───────────────────────────────────────────────
function cleanEngine(raw) {
  if (!raw) return '';
  return raw.toString().trim();
}

// ─── Main Seed ───────────────────────────────────────────────────────────────

async function seed() {
  // CSV is two levels up: /Users/M/Autogen/autogen-backend → /Users/M/
  const csvPath = process.env.CSV_PATH || path.join(__dirname, '../../PakWheels Dataset.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found at ${csvPath}`);
    process.exit(1);
  }

  console.log('Connecting to MongoDB…');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  const existing = await Vehicle.countDocuments({ source: 'db' });
  if (existing > 0) {
    console.log(`DB already has ${existing} seeded vehicles. Skipping. (Drop collection to re-seed)`);
    await mongoose.disconnect();
    return;
  }

  console.log('Reading CSV…');
  const raw = fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, ''); // strip BOM
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  });

  console.log(`Parsed ${rows.length} rows. Transforming…`);

  const BATCH = 1000;
  let inserted = 0;
  let skipped = 0;
  const buffer = [];

  for (const row of rows) {
    const price = cleanPrice(row['Price']);
    if (!price) { skipped++; continue; }

    const { make, model, variant } = extractMakeModel(row['nam']);
    const year = parseInt(row['Year'], 10);
    if (!year || year < 1950 || year > new Date().getFullYear() + 1) { skipped++; continue; }

    buffer.push({
      make,
      model,
      year,
      variant,
      body_type: row['Body Type'] || '',
      fuel_type: row['Fuel'] || '',
      engine_capacity: cleanEngine(row['Engine Capacity']),
      transmission: row['Transmission'] || '',
      color: row['Color'] || '',
      assembly: row['Assembly'] || '',
      province: row['Province'] || '',
      mileage_km: cleanMileage(row['Millage']),
      condition: 'Used',
      price_pkr: price,
      features: parseFeatures(row['Features']),
      images: [],
      description: '',
      is_listed_by_user: false,
      source: 'db',
      search_count: 0,
      ad_reference: row['Ad Reference'] || '',
    });

    if (buffer.length >= BATCH) {
      await Vehicle.insertMany(buffer, { ordered: false });
      inserted += buffer.length;
      buffer.length = 0;
      process.stdout.write(`\rInserted: ${inserted}`);
    }
  }

  if (buffer.length > 0) {
    await Vehicle.insertMany(buffer, { ordered: false });
    inserted += buffer.length;
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
