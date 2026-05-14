const axios = require('axios');

const AI_URL = () => process.env.AI_SERVICE_URL || 'http://localhost:8000';

exports.fetchAIVehicleStream = async ({ make, model, year, variant }, signal) => {
  return fetch(`${AI_URL()}/generate-vehicle-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ make, model, year, variant }),
    signal,
  });
};

exports.fetchAIVehicle = async ({ make, model, year, variant }) => {
  const { data } = await axios.post(
    `${AI_URL()}/generate-vehicle`,
    { make, model, year, variant },
    { timeout: 60000 }
  );
  return {
    make: data.make || make,
    model: data.model || model,
    year: data.year || year,
    variant: data.variant || variant || '',
    body_type: data.body_type || '',
    fuel_type: data.fuel_type || '',
    engine_capacity: data.engine_capacity || '',
    transmission: data.transmission || '',
    features: data.features || [],
    price_pkr: data.typical_price_pkr || null,
    description: data.description || '',
    known_issues: data.known_issues || [],
    maintenance_intervals: data.maintenance_intervals || null,
    parts_availability: data.parts_availability || '',
    buying_checklist: data.buying_checklist || [],
    market_position: data.market_position || '',
  };
};
