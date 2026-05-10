const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

// GET all deals
router.get('/', (req, res) => {
  const db = getDb();
  const deals = db.prepare(`
    SELECT *, 
      ROUND((julianday('now') - julianday(last_activity_date))) as days_in_stage
    FROM deals 
    ORDER BY created_at DESC
  `).all();
  res.json(deals);
});

// GET single deal
router.get('/:id', (req, res) => {
  const db = getDb();
  const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  res.json(deal);
});

// POST create deal
router.post('/', (req, res) => {
  const db = getDb();
  const { company_name, contact_name, deal_value, stage, next_action_date, notes, assigned_to } = req.body;
  const id = uuidv4();
  db.prepare(`
    INSERT INTO deals (id, company_name, contact_name, deal_value, stage, next_action_date, notes, assigned_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, company_name, contact_name, deal_value || 0, stage || 'Lead Generation', next_action_date, notes, assigned_to);
  const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(id);
  res.status(201).json(deal);
});

// PUT update deal
router.put('/:id', (req, res) => {
  const db = getDb();
  const { company_name, contact_name, deal_value, stage, next_action_date, notes, assigned_to } = req.body;
  db.prepare(`
    UPDATE deals SET 
      company_name = COALESCE(?, company_name),
      contact_name = COALESCE(?, contact_name),
      deal_value = COALESCE(?, deal_value),
      stage = COALESCE(?, stage),
      next_action_date = COALESCE(?, next_action_date),
      notes = COALESCE(?, notes),
      assigned_to = COALESCE(?, assigned_to),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(company_name, contact_name, deal_value, stage, next_action_date, notes, assigned_to, req.params.id);
  const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
  res.json(deal);
});

// PATCH move stage (drag and drop)
router.patch('/:id/stage', (req, res) => {
  const db = getDb();
  const { stage } = req.body;
  db.prepare(`
    UPDATE deals SET stage = ?, last_activity_date = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(stage, req.params.id);
  const deal = db.prepare(`
    SELECT *, ROUND((julianday('now') - julianday(last_activity_date))) as days_in_stage
    FROM deals WHERE id = ?
  `).get(req.params.id);
  res.json(deal);
});

// DELETE deal
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM deals WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
