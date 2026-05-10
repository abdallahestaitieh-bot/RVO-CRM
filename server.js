const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

getDb();

app.use('/api/deals', require('./deals'));
app.use('/api/contacts', require('./contacts'));
app.use('/api/clients', require('./clients'));
app.use('/api/revenue', require('./revenue'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`RVO CRM running on port ${PORT}`);
});
