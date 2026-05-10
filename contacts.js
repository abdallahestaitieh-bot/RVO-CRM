const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

// GET all contacts
router.get('/', (req, res) => {
  const db = getDb();
  const { status, source, assigned_to, search } = req.query;
  let query = 'SELECT * FROM contacts WHERE 1=1';
  const params = [];
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (source) { query += ' AND source = ?'; params.push(source); }
  if (assigned_to) { query += ' AND assigned_to = ?'; params.push(assigned_to); }
  if (search) { query += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  query += ' ORDER BY created_at DESC';
  const contacts = db.prepare(query).all(...params);
  res.json(contacts);
});

// GET single contact with activities
router.get('/:id', (req, res) => {
  const db = getDb();
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  const activities = db.prepare('SELECT * FROM activities WHERE contact_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...contact, activities });
});

// POST create contact
router.post('/', (req, res) => {
  const db = getDb();
  const { name, company, email, phone, source, status, assigned_to, notes, follow_up_date } = req.body;
  const id = uuidv4();
  db.prepare(`
    INSERT INTO contacts (id, name, company, email, phone, source, status, assigned_to, notes, follow_up_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, company, email, phone, source, status || 'New', assigned_to, notes, follow_up_date);
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  res.status(201).json(contact);
});

// PUT update contact
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, company, email, phone, source, status, assigned_to, notes, follow_up_date } = req.body;
  db.prepare(`
    UPDATE contacts SET
      name = COALESCE(?, name), company = COALESCE(?, company), email = COALESCE(?, email),
      phone = COALESCE(?, phone), source = COALESCE(?, source), status = COALESCE(?, status),
      assigned_to = COALESCE(?, assigned_to), notes = COALESCE(?, notes),
      follow_up_date = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(name, company, email, phone, source, status, assigned_to, notes, follow_up_date, req.params.id);
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  res.json(contact);
});

// DELETE contact
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST add activity to contact
router.post('/:id/activities', (req, res) => {
  const db = getDb();
  const { type, description } = req.body;
  const id = uuidv4();
  db.prepare(`
    INSERT INTO activities (id, contact_id, type, description) VALUES (?, ?, ?, ?)
  `).run(id, req.params.id, type, description);
  db.prepare(`UPDATE contacts SET updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
  res.status(201).json(activity);
});

module.exports = router;
