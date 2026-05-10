const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

const DEFAULT_ITEMS = [
  'Contract Signed',
  'Kickoff Call Scheduled',
  'Access Granted',
  'First Deliverable Sent',
  '30-Day Check-in Done'
];

// GET all clients with onboarding progress
router.get('/', (req, res) => {
  const db = getDb();
  const clients = db.prepare('SELECT * FROM clients ORDER BY created_at DESC').all();
  const result = clients.map(client => {
    const items = db.prepare('SELECT * FROM onboarding_items WHERE client_id = ? ORDER BY sort_order').all(client.id);
    const total = items.length;
    const completed = items.filter(i => i.completed).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    let status = 'Not Started';
    if (progress === 100) status = 'Complete';
    else if (progress > 0) status = 'In Progress';
    
    return { ...client, items, progress, status };
  });
  res.json(result);
});

// GET single client
router.get('/:id', (req, res) => {
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const items = db.prepare('SELECT * FROM onboarding_items WHERE client_id = ? ORDER BY sort_order').all(client.id);
  const total = items.length;
  const completed = items.filter(i => i.completed).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  res.json({ ...client, items, progress });
});

// POST create client (auto-creates default checklist)
router.post('/', (req, res) => {
  const db = getDb();
  const { name, company, email, contract_value, start_date } = req.body;
  const id = uuidv4();
  db.prepare(`
    INSERT INTO clients (id, name, company, email, contract_value, start_date, status)
    VALUES (?, ?, ?, ?, ?, ?, 'Not Started')
  `).run(id, name, company, email, contract_value || 0, start_date);
  
  const insertItem = db.prepare(`
    INSERT INTO onboarding_items (id, client_id, title, is_default, sort_order) VALUES (?, ?, ?, 1, ?)
  `);
  for (let i = 0; i < DEFAULT_ITEMS.length; i++) {
    insertItem.run(uuidv4(), id, DEFAULT_ITEMS[i], i);
  }
  
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  const items = db.prepare('SELECT * FROM onboarding_items WHERE client_id = ? ORDER BY sort_order').all(id);
  res.status(201).json({ ...client, items, progress: 0 });
});

// PUT update client
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, company, email, contract_value, start_date, is_churned, churn_date } = req.body;
  db.prepare(`
    UPDATE clients SET
      name = COALESCE(?, name), company = COALESCE(?, company), email = COALESCE(?, email),
      contract_value = COALESCE(?, contract_value), start_date = COALESCE(?, start_date),
      is_churned = COALESCE(?, is_churned), churn_date = COALESCE(?, churn_date),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(name, company, email, contract_value, start_date, is_churned, churn_date, req.params.id);
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  const items = db.prepare('SELECT * FROM onboarding_items WHERE client_id = ? ORDER BY sort_order').all(req.params.id);
  const total = items.length;
  const completed = items.filter(i => i.completed).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  res.json({ ...client, items, progress });
});

// PATCH toggle onboarding item
router.patch('/:id/items/:itemId', (req, res) => {
  const db = getDb();
  const { completed } = req.body;
  db.prepare(`
    UPDATE onboarding_items SET completed = ?, completed_at = ? WHERE id = ? AND client_id = ?
  `).run(completed ? 1 : 0, completed ? new Date().toISOString() : null, req.params.itemId, req.params.id);
  
  const items = db.prepare('SELECT * FROM onboarding_items WHERE client_id = ? ORDER BY sort_order').all(req.params.id);
  const total = items.length;
  const completedCount = items.filter(i => i.completed).length;
  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  
  let status = 'Not Started';
  if (progress === 100) status = 'Complete';
  else if (progress > 0) status = 'In Progress';
  
  db.prepare(`UPDATE clients SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, req.params.id);
  res.json({ items, progress, status });
});

// POST add custom checklist item
router.post('/:id/items', (req, res) => {
  const db = getDb();
  const { title } = req.body;
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM onboarding_items WHERE client_id = ?').get(req.params.id);
  const id = uuidv4();
  db.prepare(`
    INSERT INTO onboarding_items (id, client_id, title, is_default, sort_order) VALUES (?, ?, ?, 0, ?)
  `).run(id, req.params.id, title, (maxOrder.m || 0) + 1);
  const item = db.prepare('SELECT * FROM onboarding_items WHERE id = ?').get(id);
  res.status(201).json(item);
});

// DELETE checklist item
router.delete('/:id/items/:itemId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM onboarding_items WHERE id = ? AND client_id = ?').run(req.params.itemId, req.params.id);
  res.json({ success: true });
});

// DELETE client
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
