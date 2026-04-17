import fs from "node:fs";
import path from "node:path";

const DB = process.env.DATABASE_URL || path.resolve(process.cwd(), "data/journal.db");
const BACKUP_DIR = path.resolve(process.cwd(), "data/backups");
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const out = path.join(BACKUP_DIR, `journal-${ts}.db`);
fs.copyFileSync(DB, out);
console.log("Backup written:", out);
