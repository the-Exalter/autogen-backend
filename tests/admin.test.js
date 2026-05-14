const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

let adminToken, userToken;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/autogen_test');

  const hash = await bcrypt.hash('Admin123!', 12);
  await User.create({ name: 'Admin', email: 'admin@autogen.pk', password_hash: hash, role: 'admin' });

  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'admin@autogen.pk', password: 'Admin123!',
  });
  adminToken = adminLogin.body.token;

  const reg = await request(app).post('/api/auth/register').send({
    name: 'Regular', email: 'regular@autogen.pk', password: 'Pass123!',
  });
  userToken = reg.body.token;
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

describe('Admin', () => {
  it('returns stats for admin', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalVehicles).toBeDefined();
  });

  it('blocks regular users from admin routes', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('blocks unauthenticated from admin routes', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });
});
