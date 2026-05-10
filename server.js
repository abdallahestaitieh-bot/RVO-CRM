const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize DB on startup
getDb();

// API Routes
app.use('/api/deals', require('./routes/deals'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/revenue', require('./routes/revenue'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`RVO CRM Backend running on http://localhost:${PORT}`);
});

module.exports = app;
