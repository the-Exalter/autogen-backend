const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Vehicle = require('../models/Vehicle');

let token, vehicleId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/autogen_test');
  const v = await Vehicle.create({ make: 'Toyota', model: 'Yaris', year: 2021, price_pkr: 2200000, source: 'db' });
  vehicleId = v._id.toString();

  const reg = await request(app).post('/api/auth/register').send({
    name: 'BM User', email: 'bm@autogen.pk', password: 'Pass123!',
  });
  token = reg.body.token;
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

describe('Bookmarks', () => {
  it('adds a bookmark', async () => {
    const res = await request(app)
      .post(`/api/bookmarks/${vehicleId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.bookmarks).toContain(vehicleId);
  });

  it('lists bookmarks', async () => {
    const res = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('removes a bookmark', async () => {
    const res = await request(app)
      .delete(`/api/bookmarks/${vehicleId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.bookmarks).not.toContain(vehicleId);
  });

  it('requires auth', async () => {
    const res = await request(app).get('/api/bookmarks');
    expect(res.status).toBe(401);
  });
});
