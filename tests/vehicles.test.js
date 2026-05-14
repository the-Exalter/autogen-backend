const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Vehicle = require('../models/Vehicle');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/autogen_test');
  await Vehicle.create([
    { make: 'Toyota', model: 'Corolla', year: 2020, body_type: 'Sedan', fuel_type: 'Petrol', price_pkr: 3500000, source: 'db' },
    { make: 'Honda', model: 'Civic', year: 2019, body_type: 'Sedan', fuel_type: 'Petrol', price_pkr: 4000000, source: 'db' },
    { make: 'Suzuki', model: 'Alto', year: 2022, body_type: 'Hatchback', fuel_type: 'Petrol', price_pkr: 1800000, source: 'db' },
  ]);
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

describe('Vehicles', () => {
  it('lists all vehicles', async () => {
    const res = await request(app).get('/api/vehicles');
    expect(res.status).toBe(200);
    expect(res.body.vehicles.length).toBeGreaterThan(0);
    expect(res.body.total).toBeDefined();
  });

  it('filters by body_type', async () => {
    const res = await request(app).get('/api/vehicles?body_type=Hatchback');
    expect(res.status).toBe(200);
    expect(res.body.vehicles.every((v) => v.body_type === 'Hatchback')).toBe(true);
  });

  it('filters by price range', async () => {
    const res = await request(app).get('/api/vehicles?price_min=3000000&price_max=4500000');
    expect(res.status).toBe(200);
    res.body.vehicles.forEach((v) => {
      expect(v.price_pkr).toBeGreaterThanOrEqual(3000000);
      expect(v.price_pkr).toBeLessThanOrEqual(4500000);
    });
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/vehicles/000000000000000000000000');
    expect(res.status).toBe(404);
  });

  it('gets a vehicle by id', async () => {
    const all = await request(app).get('/api/vehicles');
    const id = all.body.vehicles[0]._id;
    const res = await request(app).get(`/api/vehicles/${id}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(id);
  });
});
