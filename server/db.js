import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
const dbPath=path.resolve(process.env.DATABASE_PATH||'./data/leads.sqlite');
fs.mkdirSync(path.dirname(dbPath),{recursive:true});
export const db=new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`CREATE TABLE IF NOT EXISTS leads (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 student_name TEXT NOT NULL, parent_name TEXT NOT NULL, mobile TEXT NOT NULL,
 whatsapp TEXT, class_name TEXT NOT NULL, exam TEXT NOT NULL, target_year TEXT,
 current_coaching TEXT, preferred_subject TEXT, city TEXT, language TEXT,
 message TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
export const insertLead=db.prepare(`INSERT INTO leads
(student_name,parent_name,mobile,whatsapp,class_name,exam,target_year,current_coaching,preferred_subject,city,language,message)
VALUES (@studentName,@parentName,@mobile,@whatsapp,@className,@exam,@targetYear,@currentCoaching,@preferredSubject,@city,@language,@message)`);
