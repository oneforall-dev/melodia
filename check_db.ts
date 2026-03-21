
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, 'melodia.db');

console.log('Checking DB at:', dbPath);

try {
  const db = new Database(dbPath);
  console.log('DB opened successfully');
  
  const tableInfo = db.prepare("PRAGMA table_info(tracks)").all();
  console.log('Tracks table columns:', tableInfo.map((c: any) => c.name));
  
} catch (e) {
  console.error('DB check failed:', e);
  process.exit(1);
}
