const Vehicle = require('../models/Vehicle');
const SearchLog = require('../models/SearchLog');
const { fetchAIVehicle, fetchAIVehicleStream } = require('../services/aiService');
const { searchKB, correctMake } = require('../services/vehicleKB');

exports.listVehicles = async (req, res) => {
  try {
    const {
      q, body_type, fuel_type, transmission, province, variant,
      year_min, year_max, price_min, price_max, source,
      page = 1, limit = 20,
    } = req.query;

    let filter = {};

    if (source === 'user_listing') {
      filter.source = 'user_listing';
    } else if (source === 'db') {
      filter.source = { $in: ['db', 'ai_generated'] };
    } else {
      filter.source = { $in: ['db', 'user_listing', 'ai_generated'] };
    }

    if (q) {
      filter.$text = { $search: q };
    }
    if (body_type) filter.body_type = { $regex: body_type, $options: 'i' };
    if (fuel_type) filter.fuel_type = { $regex: fuel_type, $options: 'i' };
    if (transmission) filter.transmission = { $regex: transmission, $options: 'i' };
    if (province) filter.province = { $regex: province, $options: 'i' };
    if (variant) filter.variant = variant;
    if (year_min || year_max) {
      filter.year = {};
      if (year_min) filter.year.$gte = Number(year_min);
      if (year_max) filter.year.$lte = Number(year_max);
    }
    if (price_min || price_max) {
      const priceFilter = {};
      if (price_min) priceFilter.$gte = Number(price_min);
      if (price_max) priceFilter.$lte = Number(price_max);
      filter.$or = filter.$or || [];
      filter.$or.push(
        { price_pkr: priceFilter },
        { price_usd: priceFilter }
      );
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [vehicles, total, variantFacets] = await Promise.all([
      Vehicle.find(filter).skip(skip).limit(Number(limit)).lean(),
      Vehicle.countDocuments(filter),
      Vehicle.aggregate([
        { $match: filter },
        { $group: { _id: '$variant' } },
        { $match: { _id: { $ne: null, $ne: '' } } },
        { $sort: { _id: 1 } },
        { $limit: 20 },
      ]),
    ]);

    // Log search
    if (q) {
      await SearchLog.create({ query: q, matched: vehicles.length > 0, ai_triggered: false });
    }

    res.json({
      vehicles,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      variants: variantFacets.map((v) => v._id),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).lean();
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.aiSearch = async (req, res) => {
  try {
    const { make, model, year, variant } = req.body;
    if (!make || !model) return res.status(400).json({ error: 'make and model required' });

    const yearNum = year ? Number(year) : null;

    // Cache lookup
    const cacheQuery = {
      source: 'ai_generated',
      make: { $regex: new RegExp(`^${make}$`, 'i') },
      model: { $regex: new RegExp(`^${model}$`, 'i') },
    };
    if (yearNum) cacheQuery.year = yearNum;

    const cached = await Vehicle.findOne(cacheQuery);
    if (cached && cached.expires_at > new Date()) {
      await Vehicle.findByIdAndUpdate(cached._id, { $inc: { search_count: 1 } });
      await SearchLog.create({ query: `${make} ${model} ${year || ''}`, matched: true, ai_triggered: true });
      return res.json({ ...cached.toObject(), _cached: true });
    }

    // Call AI microservice
    const aiData = await fetchAIVehicle({ make, model, year: yearNum, variant });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    let vehicleDoc;
    if (cached) {
      // Refresh expired entry
      vehicleDoc = await Vehicle.findByIdAndUpdate(
        cached._id,
        {
          ...aiData,
          source: 'ai_generated',
          search_count: 1,
          ai_generated_at: new Date(),
          expires_at: expiresAt,
        },
        { new: true }
      );
    } else {
      vehicleDoc = await Vehicle.create({
        ...aiData,
        source: 'ai_generated',
        search_count: 1,
        ai_generated_at: new Date(),
        expires_at: expiresAt,
      });
    }

    await SearchLog.create({ query: `${make} ${model} ${year || ''}`, matched: true, ai_triggered: true });
    res.json(vehicleDoc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.incrementSearchCount = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { $inc: { search_count: 1 } },
      { new: true }
    );
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ search_count: vehicle.search_count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({
      suggestions: [], corrected: false,
      correctedQuery: q, originalQuery: q, aiAvailable: false,
    });

    // Spell correction from KB makes
    const correction = correctMake(q);
    const searchQuery = correction ? correction.correctedQuery : q;

    // DB search
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(escaped, 'i');
    const dbResults = await Vehicle.find({
      $or: [{ make: rx }, { model: rx }],
    })
      .limit(4)
      .select({ make: 1, model: 1, year: 1, body_type: 1, source: 1, images: { $slice: 1 } })
      .lean();

    // KB fuzzy search to fill remaining slots
    const kbLimit = Math.max(0, 6 - dbResults.length);
    const dbKeys = new Set(
      dbResults.map(d => `${d.make}|${d.model}`.toLowerCase())
    );
    const kbResults = kbLimit > 0
      ? searchKB(searchQuery, kbLimit + 2)
          .filter(k => !dbKeys.has(`${k.make}|${k.model}`.toLowerCase()))
          .slice(0, kbLimit)
          .map(k => ({
            make: k.make,
            model: k.model,
            variant: k.variant,
            category: k.category,
            body_type: k.type,
            _id: null,
            source: 'kb',
            isExact: false,
          }))
      : [];

    const dbMarked = dbResults.map(d => ({
      ...d,
      isExact: true,
      source: d.source || 'db',
    }));

    return res.json({
      suggestions: [...dbMarked, ...kbResults],
      corrected: correction ? true : false,
      correctedQuery: correction ? correction.correctedQuery : q,
      originalQuery: q,
      aiAvailable: q.length >= 3,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.streamAiSearch = async (req, res) => {
  const { make, model, year, variant } = req.body;
  if (!make || !model) {
    return res.status(400).json({ error: 'make and model required' });
  }

  const yearNum = year ? Number(year) : null;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendEvent = (type, data) =>
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    const cacheQuery = {
      source: 'ai_generated',
      make: { $regex: new RegExp(`^${make}$`, 'i') },
      model: { $regex: new RegExp(`^${model}$`, 'i') },
    };
    if (yearNum) cacheQuery.year = yearNum;

    const cached = await Vehicle.findOne(cacheQuery);
    if (cached && cached.expires_at > new Date()) {
      await Vehicle.findByIdAndUpdate(cached._id, { $inc: { search_count: 1 } });
      await SearchLog.create({ query: `${make} ${model} ${year || ''}`, matched: true, ai_triggered: true });
      sendEvent('done', { vehicle: { ...cached.toObject(), _cached: true } });
      res.end();
      return;
    }

    const controller = new AbortController();
    req.on('close', () => controller.abort());

    const upstreamRes = await fetchAIVehicleStream(
      { make, model, year: yearNum, variant },
      controller.signal,
    );

    if (!upstreamRes.ok) {
      sendEvent('error', { message: `AI service returned ${upstreamRes.status}` });
      res.end();
      return;
    }

    const reader = upstreamRes.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
let vehicleData = null;

try {
  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

    const parts = buffer.split('\n\n');
    buffer = parts.pop();

    for (const part of parts) {
      if (!part.trim()) continue;

      let eventType = 'message';
      let dataStr = '';

      for (const line of part.split('\n')) {
        if (line.startsWith('event: ')) eventType = line.slice(7).trim();
        else if (line.startsWith('data: ')) dataStr = line.slice(6);
      }

      if (eventType === 'delta') {
        res.write(`event: delta\ndata: ${dataStr}\n\n`);
      } else if (eventType === 'done') {
        try { vehicleData = JSON.parse(dataStr).vehicle; } catch (e) {
        }
        res.write(`event: done\ndata: ${dataStr}\n\n`);
      } else if (eventType === 'error') {
        res.write(`event: error\ndata: ${dataStr}\n\n`);
      }
    }
  }
} catch (streamErr) {
  if (streamErr.name !== 'AbortError' && !res.writableEnded) {
    sendEvent('error', { message: streamErr.message });
  }
}

    res.end();

    if (vehicleData) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const aiData = {
        make: vehicleData.make || make,
        model: vehicleData.model || model,
        year: vehicleData.year || yearNum,
        variant: vehicleData.variant || variant || '',
        body_type: vehicleData.body_type || '',
        fuel_type: vehicleData.fuel_type || '',
        engine_capacity: vehicleData.engine_capacity || '',
        transmission: vehicleData.transmission || '',
        features: vehicleData.features || [],
        price_pkr: vehicleData.typical_price_pkr || null,
        description: vehicleData.description || '',
        known_issues: vehicleData.known_issues || [],
        maintenance_intervals: vehicleData.maintenance_intervals || null,
        parts_availability: vehicleData.parts_availability || '',
        buying_checklist: vehicleData.buying_checklist || [],
        market_position: vehicleData.market_position || '',
      };

      if (cached) {
        await Vehicle.findByIdAndUpdate(cached._id, {
          ...aiData,
          source: 'ai_generated',
          search_count: 1,
          ai_generated_at: new Date(),
          expires_at: expiresAt,
        });
      } else {
        await Vehicle.create({
          ...aiData,
          source: 'ai_generated',
          search_count: 1,
          ai_generated_at: new Date(),
          expires_at: expiresAt,
        });
      }
      await SearchLog.create({ query: `${make} ${model} ${year || ''}`, matched: true, ai_triggered: true });
    }
  } catch (err) {
    if (!res.writableEnded) {
      sendEvent('error', { message: err.message });
      res.end();
    }
  }
};
