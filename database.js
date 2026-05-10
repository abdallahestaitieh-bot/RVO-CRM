const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'crm.db');
let db;

function getDb() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) console.error('DB Error:', err);
      else { console.log('Database connected'); initSchema(); }
    });
    db.run = promisify(db, 'run');
    db.get = promisify(db, 'get');
    db.all = promisify(db, 'all');
  }
  return db;
}

function promisify(db, method) {
  const orig = db[method].bind(db);
  return function(sql, params) {
    return new Promise((resolve, reject) => {
      orig(sql, params || [], function(err, result) {
        if (err) reject(err);
        else resolve(method === 'run' ? this : result);
      });
    });
  };
}

function runSync(sql, params) {
  return new Promise((resolve, reject) => {
    db._db ? db._db.run(sql, params||[], function(e){ e?reject(e):resolve(this); })
    : db.__proto__.constructor.prototype.run.call(db, sql, params||[], function(e){ e?reject(e):resolve(this); });
  });
}

function initSchema() {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY, company_name TEXT NOT NULL, contact_name TEXT NOT NULL,
      deal_value REAL DEFAULT 0, stage TEXT NOT NULL DEFAULT 'Lead Generation',
      next_action_date TEXT, last_activity_date TEXT DEFAULT (datetime('now')),
      notes TEXT, assigned_to TEXT,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT,
      source TEXT, status TEXT DEFAULT 'New', assigned_to TEXT, notes TEXT, follow_up_date TEXT,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY, contact_id TEXT, deal_id TEXT, type TEXT NOT NULL,
      description TEXT, created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, company TEXT, email TEXT,
      contract_value REAL DEFAULT 0, start_date TEXT, status TEXT DEFAULT 'Not Started',
      is_churned INTEGER DEFAULT 0, churn_date TEXT,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS onboarding_items (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, title TEXT NOT NULL,
      completed INTEGER DEFAULT 0, completed_at TEXT, is_default INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
    )`
  ];

  let i = 0;
  function next() {
    if (i >= stmts.length) { seedData(); return; }
    db.run(stmts[i++]).then(next).catch(e => console.error(e));
  }
  next();
}

function seedData() {
  db.get('SELECT COUNT(*) as c FROM deals').then(row => {
    if (row.c > 0) return;

    const deals = [
      ['Horizon Tech','Sara Al-Rashid',18000,'Lead Generation',3,-2],
      ['Gulf Ventures','Khalid Mansour',35000,'Inquiry',1,-4],
      ['AlMasraf Group','Fatima Nasser',52000,'Qualification',5,-1],
      ['NovaBridge LLC','James Harrington',28000,'Strategy Call',-1,-8],
      ['Cedar Digital','Rami Khoury',75000,'Proposal',2,-3],
      ['Emirates Scale','Aisha Haddad',120000,'Close',1,-1],
      ['Pulse Media','Tom Ellsworth',22000,'Onboarding',4,-5],
      ['Vertex Partners','Dana Aziz',48000,'Retention',7,-2],
      ['Synapse Growth','Omar Sheikh',95000,'Upsell & Referral',3,-1],
      ['Apex Consulting','Lina Farhat',31000,'Qualification',-2,-6],
      ['Meridian Co','Hassan Yousef',67000,'Proposal',1,-2],
      ['Bright Forward','Maya Salam',19500,'Lead Generation',-3,-10],
    ];

    deals.forEach(([company,contact,value,stage,dueDays,actDays]) => {
      db.run(
        `INSERT INTO deals (id,company_name,contact_name,deal_value,stage,next_action_date,last_activity_date) VALUES (?,?,?,?,?,datetime('now',?),datetime('now',?))`,
        [uuidv4(),company,contact,value,stage,`+${dueDays} days`,`${actDays} days`]
      );
    });

    const contacts = [
      ['Sara Al-Rashid','Horizon Tech','sara@horizontech.com','+971 50 123 4567','LinkedIn','Qualified',-2],
      ['Khalid Mansour','Gulf Ventures','k.mansour@gulfventures.ae','+971 55 987 6543','Referral','New',2],
      ['James Harrington','NovaBridge LLC','james@novabridge.io','+1 310 555 0182','Cold Outreach','Contacted',-1],
      ['Rami Khoury','Cedar Digital','rami@cedardigital.lb','+961 3 456 789','Conference','Proposal Sent',1],
      ['Fatima Nasser','AlMasraf Group','f.nasser@almasraf.com','+966 55 321 6789','LinkedIn','Qualified',3],
      ['Dana Aziz','Vertex Partners','dana@vertexpartners.com','+971 52 654 3210','Website','Client',7],
    ];

    contacts.forEach(([name,company,email,phone,source,status,fuDays]) => {
      db.run(
        `INSERT INTO contacts (id,name,company,email,phone,source,status,assigned_to,follow_up_date) VALUES (?,?,?,?,?,?,?,?,date('now',?))`,
        [uuidv4(),name,company,email,phone,source,status,'Abdallah',`+${fuDays} days`]
      );
    });

    const DEFAULT_ITEMS = ['Contract Signed','Kickoff Call Scheduled','Access Granted','First Deliverable Sent','30-Day Check-in Done'];

    const clients = [
      ['Dana Aziz','Vertex Partners','dana@vertexpartners.com',48000,'2024-11-01',5],
      ['Omar Sheikh','Synapse Growth','omar@synapsegrowth.co',95000,'2025-01-15',3],
      ['Aisha Haddad','Emirates Scale','aisha@emiratesscale.ae',120000,'2025-03-01',2],
      ['Tom Ellsworth','Pulse Media','tom@pulsemedia.co',22000,'2025-04-01',0],
    ];

    clients.forEach(([name,company,email,value,start,doneCount]) => {
      const cid = uuidv4();
      db.run(
        `INSERT INTO clients (id,name,company,email,contract_value,start_date) VALUES (?,?,?,?,?,?)`,
        [cid,name,company,email,value,start]
      );
      DEFAULT_ITEMS.forEach((title,i) => {
        db.run(
          `INSERT INTO onboarding_items (id,client_id,title,completed,is_default,sort_order) VALUES (?,?,?,?,1,?)`,
          [uuidv4(),cid,title,i<doneCount?1:0,i]
        );
      });
    });
  });
}

module.exports = { getDb };
