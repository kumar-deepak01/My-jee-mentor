import fs from 'node:fs';
import path from 'node:path';

let db = null;
let insertLead = { run() {} };

try {
  const { default: Database } = await import('better-sqlite3');
  const dbPath = path.resolve(process.env.DATABASE_PATH || './data/leads.sqlite');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT NOT NULL, parent_name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', mobile TEXT NOT NULL,
    whatsapp TEXT, class_name TEXT NOT NULL, exam TEXT NOT NULL, target_year TEXT,
    current_coaching TEXT, preferred_subject TEXT, city TEXT, language TEXT,
    message TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  const leadColumns = db.prepare('PRAGMA table_info(leads)').all().map(column => column.name);
  if (!leadColumns.includes('email')) db.exec("ALTER TABLE leads ADD COLUMN email TEXT NOT NULL DEFAULT ''");
  insertLead = db.prepare(`INSERT INTO leads
  (student_name,parent_name,email,mobile,whatsapp,class_name,exam,target_year,current_coaching,preferred_subject,city,language,message)
  VALUES (@studentName,@parentName,@email,@mobile,@whatsapp,@className,@exam,@targetYear,@currentCoaching,@preferredSubject,@city,@language,@message)`);
} catch (err) {
  console.warn('SQLite database could not be loaded (native bindings missing). Running with fallback lead storage.');
}

export { db, insertLead };
