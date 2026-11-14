import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { MAPPINGS } from '../d1/mapping.mjs';

const schema = await readFile(new URL('../d1/schema.sql', import.meta.url), 'utf8');
const db = new DatabaseSync(':memory:');
db.exec(schema);
console.log('schema.sql executed OK');

const snakeCase = (s) => s.replace(/([A-Z])/g, '_$1').toLowerCase();
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table'")
  .all()
  .map((r) => r.name);

let problems = 0;
for (const m of MAPPINGS) {
  if (!tables.includes(m.table)) {
    console.error(`MISSING TABLE: ${m.table}`);
    problems++;
    continue;
  }
  const schemaCols = new Set(
    db.prepare(`PRAGMA table_info(${m.table})`).all().map((r) => r.name)
  );
  const mappedCols = new Set([
    'id',
    ...(m.fields || []).map(snakeCase),
    ...(m.refs || []).map((r) => `${snakeCase(r)}_id`),
    ...(m.json || []).map(snakeCase)
  ]);
  for (const col of mappedCols) {
    if (!schemaCols.has(col)) {
      console.error(`${m.table}: mapping column '${col}' NOT in schema`);
      problems++;
    }
  }
  for (const col of schemaCols) {
    if (!mappedCols.has(col)) {
      console.error(`${m.table}: schema column '${col}' NOT covered by mapping`);
      problems++;
    }
  }
}

const mappedTables = new Set(MAPPINGS.map((m) => m.table));
for (const t of tables) {
  if (!mappedTables.has(t)) console.warn(`note: table '${t}' has no mapping`);
}

console.log(problems === 0 ? 'ALL CHECKS PASSED' : `${problems} PROBLEM(S) FOUND`);
process.exit(problems === 0 ? 0 : 1);
