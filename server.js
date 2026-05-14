require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const cron = require('node-cron');

const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const listingRoutes = require('./routes/listings');
const bookmarkRoutes = require('./routes/bookmarks');
const compareRoutes = require('./routes/compare');
const predictRoutes = require('./routes/predict');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');
const usedMarketRoutes = require('./routes/usedmarket');
const contactRoutes = require('./routes/contact');

const { purgeStaleAICache } = require('./services/cacheService');

const app = express();

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://autogen-frontend.vercel.app',
    /\.vercel\.app$/,
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Accept'],
  credentials: true,
};

app.options('*', cors(corsOptions)); // preflight FIRST before everything
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/predict', predictRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/used-market', usedMarketRoutes);
app.use('/api/contact', contactRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');

    cron.schedule('0 2 * * *', async () => {
      const removed = await purgeStaleAICache();
      console.log(`[cron] AI cache purge: removed ${removed} entries`);
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;