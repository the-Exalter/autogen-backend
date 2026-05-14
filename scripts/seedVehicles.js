require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const Vehicle = require('../models/Vehicle');
const SearchLog = require('../models/SearchLog');

const VEHICLES = [
  // LAND — CARS
  { make: 'Ferrari', model: 'F40', year: 1992, wikiTitle: 'Ferrari F40' },
  { make: 'Volkswagen', model: 'Beetle', year: 1967, wikiTitle: 'Volkswagen Beetle' },
  { make: 'Toyota', model: 'Land Cruiser', year: 2020, wikiTitle: 'Toyota Land Cruiser' },
  { make: 'Ford', model: 'Model T', year: 1927, wikiTitle: 'Ford Model T' },
  { make: 'Tesla', model: 'Cybertruck', year: 2024, wikiTitle: 'Tesla Cybertruck' },
  { make: 'Bugatti', model: 'Veyron', year: 2008, wikiTitle: 'Bugatti Veyron' },
  { make: 'Tata', model: 'Nano', year: 2010, wikiTitle: 'Tata Nano' },
  { make: 'Land Rover', model: 'Defender', year: 2023, wikiTitle: 'Land Rover Defender' },

  // LAND — MOTORCYCLES
  { make: 'Yamaha', model: 'YZF-R1', year: 2021, wikiTitle: 'Yamaha YZF-R1' },
  { make: 'Harley-Davidson', model: 'Fat Boy', year: 2022, wikiTitle: 'Harley-Davidson Fat Boy' },
  { make: 'Royal Enfield', model: 'Bullet 350', year: 1965, wikiTitle: 'Royal Enfield Bullet' },
  { make: 'Ducati', model: 'Panigale V4', year: 2023, wikiTitle: 'Ducati Panigale V4' },
  { make: 'Honda', model: 'Super Cub C50', year: 1969, wikiTitle: 'Honda Super Cub' },

  // LAND — TRUCKS AND HEAVY
  { make: 'Kenworth', model: 'W900', year: 2019, wikiTitle: 'Kenworth W900' },
  { make: 'Caterpillar', model: '797F', year: 2016, wikiTitle: 'Caterpillar 797' },
  { make: 'Mercedes-Benz', model: 'Unimog U4023', year: 2021, wikiTitle: 'Unimog' },

  // LAND — OTHER
  { make: 'Zamboni', model: '552', year: 2018, wikiTitle: 'Zamboni (machine)' },
  { make: 'John Deere', model: '8R 410', year: 2022, wikiTitle: 'John Deere' },

  // AIR — COMMERCIAL AND GENERAL AVIATION
  { make: 'Boeing', model: '747-400', year: 1989, wikiTitle: 'Boeing 747' },
  { make: 'Cessna', model: '172 Skyhawk', year: 2020, wikiTitle: 'Cessna 172' },
  { make: 'Airbus', model: 'A380', year: 2007, wikiTitle: 'Airbus A380' },
  { make: 'Piper', model: 'PA-28 Cherokee', year: 1978, wikiTitle: 'Piper PA-28 Cherokee' },
  { make: 'Aerospatiale', model: 'Concorde', year: 1976, wikiTitle: 'Concorde' },

  // AIR — MILITARY
  { make: 'Lockheed Martin', model: 'F-22 Raptor', year: 2005, wikiTitle: 'Lockheed Martin F-22 Raptor' },
  { make: 'Supermarine', model: 'Spitfire Mk IX', year: 1943, wikiTitle: 'Supermarine Spitfire' },

  // AIR — UAV
  { make: 'DJI', model: 'Matrice 300 RTK', year: 2020, wikiTitle: 'DJI Matrice 300 RTK' },
  { make: 'General Atomics', model: 'MQ-9 Reaper', year: 2007, wikiTitle: 'General Atomics MQ-9 Reaper' },

  // SEA — RECREATIONAL
  { make: 'Sunseeker', model: 'Predator 57', year: 2021, wikiTitle: 'Sunseeker' },
  { make: 'Hobie Cat', model: '16', year: 1970, wikiTitle: 'Hobie Cat' },
  { make: 'Yamaha', model: 'WaveRunner FX SVHO', year: 2022, wikiTitle: 'WaveRunner' },
  { make: 'Beneteau', model: 'Oceanis 46.1', year: 2021, wikiTitle: 'Beneteau' },

  // SEA — COMMERCIAL AND MILITARY
  { make: 'Maersk', model: 'Triple-E', year: 2013, wikiTitle: 'Maersk Triple-E class' },
  { make: 'US Navy', model: 'Gerald R. Ford CVN-78', year: 2017, wikiTitle: 'USS Gerald R. Ford' },
  { make: 'Triton', model: '36000/2', year: 2019, wikiTitle: 'DSV Limiting Factor' },

  // SPACE AND SPECIALTY
  { make: 'SpaceX', model: 'Falcon 9', year: 2015, wikiTitle: 'Falcon 9' },
  { make: 'NASA', model: 'Space Shuttle Orbiter', year: 1981, wikiTitle: 'Space Shuttle' },
  { make: 'NASA', model: 'Lunar Roving Vehicle', year: 1971, wikiTitle: 'Lunar rover (Apollo)' },
];

// Infobox label → schema field mapping
const LABEL_MAP = [
  { fields: ['engine'],                           key: 'engine_capacity' },
  { fields: ['transmission'],                     key: 'transmission' },
  { fields: ['body style', 'body type', 'type'],  key: 'body_type' },
  { fields: ['fuel type', 'fuel'],                key: 'fuel_type' },
  { fields: ['assembly', 'manufactured'],         key: 'assembly' },
];

function matchLabel(label) {
  const lower = label.toLowerCase().trim();
  for (const { fields, key } of LABEL_MAP) {
    if (fields.some((f) => lower.includes(f))) return key;
  }
  return null;
}

function cleanText(raw) {
  // Strip footnote refs like [1], citation cruft, and excess whitespace
  return raw
    .replace(/\[.*?\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const wiki = axios.create({
  baseURL: 'https://en.wikipedia.org/w/api.php',
  timeout: 15000,
  headers: { 'User-Agent': 'AutoGenSeeder/1.0 (educational project)' },
});

async function fetchImage(wikiTitle) {
  try {
    const { data } = await wiki.get('', {
      params: { action: 'query', titles: wikiTitle, prop: 'pageimages', format: 'json', pithumbsize: 800 },
    });
    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0];
    return page?.thumbnail?.source || null;
  } catch {
    return null;
  }
}

async function fetchDescription(wikiTitle) {
  try {
    const { data } = await wiki.get('', {
      params: { action: 'query', titles: wikiTitle, prop: 'extracts', exintro: true, explaintext: true, format: 'json' },
    });
    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0];
    const extract = page?.extract || '';
    const firstPara = extract.split('\n').find((l) => l.trim().length > 0) || '';
    return firstPara.slice(0, 500);
  } catch {
    return '';
  }
}

async function fetchSpecs(wikiTitle) {
  const specs = {};
  try {
    const { data } = await wiki.get('', {
      params: { action: 'parse', page: wikiTitle, prop: 'text', format: 'json' },
    });
    const html = data.parse?.text?.['*'];
    if (!html) return specs;

    const $ = cheerio.load(html);
    const infobox = $('table.infobox').first();
    if (!infobox.length) return specs;

    infobox.find('tr').each((_, row) => {
      const th = $(row).find('th').first().text();
      const td = $(row).find('td').first().text();
      if (!th || !td) return;

      const key = matchLabel(th);
      if (key && !specs[key]) {
        specs[key] = cleanText(td);
      }
    });
  } catch {
    // return whatever was collected
  }
  return specs;
}

async function run() {
  const startTime = Date.now();

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  const total = VEHICLES.length;
  let seeded = 0;
  let partial = 0;
  const notSaved = [];

  for (let i = 0; i < total; i++) {
    const { make, model, year, wikiTitle } = VEHICLES[i];
    const label = `${make} ${model} ${year}`;
    process.stdout.write(`[${i + 1}/${total}] ${label}... `);

    // Skip if already exists
    const exists = await Vehicle.exists({ make, model, year });
    if (exists) {
      console.log('skipped (already exists)');
      seeded++;
      continue;
    }

    let imageUrl = null;
    let description = '';
    let specs = {};
    let isPartial = false;

    // Fetch all three in sequence (Wikipedia asks for polite sequential access)
    try {
      imageUrl = await fetchImage(wikiTitle);
    } catch { isPartial = true; }
    process.stdout.write(imageUrl ? 'image ✓ ... ' : 'image ✗ ... ');

    try {
      specs = await fetchSpecs(wikiTitle);
    } catch { isPartial = true; }
    const hasSpecs = Object.keys(specs).length > 0;
    process.stdout.write(hasSpecs ? 'specs ✓ ... ' : 'specs ✗ ... ');
    if (!hasSpecs) isPartial = true;

    try {
      description = await fetchDescription(wikiTitle);
    } catch { isPartial = true; }

    const doc = {
      make,
      model,
      year,
      variant: '',
      body_type: specs.body_type || '',
      fuel_type: specs.fuel_type || '',
      engine_capacity: specs.engine_capacity || '',
      transmission: specs.transmission || '',
      color: '',
      assembly: specs.assembly || '',
      price_pkr: null,
      description,
      features: [],
      known_issues: [],
      maintenance_intervals: null,
      parts_availability: '',
      buying_checklist: [],
      market_position: '',
      images: imageUrl ? [imageUrl] : [],
      source: 'db',
      search_count: 0,
      is_featured: false,
      ai_generated_at: new Date(),
    };

    try {
      await Vehicle.create(doc);
      if (isPartial) {
        console.log('saved ✓ (partial)');
        partial++;
      } else {
        console.log('saved ✓');
        seeded++;
      }
    } catch (err) {
      console.log(`FAILED to save — ${err.message.slice(0, 80)}`);
      notSaved.push(label);
      continue;
    }

    if (i < total - 1) await sleep(1000);
  }

  const duration = ((Date.now() - startTime) / 60000).toFixed(1);

  console.log('\n=== Seeding Complete ===');
  console.log(`Seeded:   ${seeded} vehicles`);
  console.log(`Partial:  ${partial} vehicles (saved with incomplete data)`);
  console.log(`Failed:   ${notSaved.length}${notSaved.length ? ' — ' + notSaved.join(', ') : ''}`);
  console.log(`Duration: ${duration} minutes`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
