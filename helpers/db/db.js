/*
DATABASE

Handles all changes in the database and updates the SQLite .db file to the new schema with a migration table.
*/

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', '../data/db/'); //../data/db
const DB_PATH = path.join(DATA_DIR, process.env.DB_FILE || 'chattish.db');
const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'migrations');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH, { fileMustExist: false });

// Basic pragmas
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Ensure migrations table exists
db.exec(`
	CREATE TABLE IF NOT EXISTS migrations (
		id TEXT PRIMARY KEY,
		applied_at INTEGER NOT NULL
	);
`);

function getAppliedMigrations() {
	const rows = db.prepare('SELECT id FROM migrations').all();
	return new Set(rows.map((r) => r.id));
}

function applyMigrationFile(filename) {
	const id = filename;
	const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');

	const applyTxn = db.transaction(() => {
		db.exec(sql);
		db.prepare(
			"INSERT INTO migrations (id, applied_at) VALUES (?, strftime('%s','now'))"
		).run(id);

	});

	applyTxn();
}

function runMigrations() {
	if (!fs.existsSync(MIGRATIONS_DIR)) {
		console.log(`⚠️  Migrations directory not found`.yellow + `, skipping migrations`.gray);
		return;
	}

	const files = fs.readdirSync(MIGRATIONS_DIR)
		.filter((f) => f.endsWith('.sql'))
		.sort();

	const applied = getAppliedMigrations();

	for (const file of files) {
		if (applied.has(file)) {
		//console.log(`skip ${file}`);
		continue;
		}

		try {
			console.log(`Migrating`.gray, `${file}`.white.bold, `...`.gray);
		applyMigrationFile(file);
		} catch (err) {
			console.error(`Error applying migration to `.gray, `${file}:`.red.bold, err);
		// If a migration fails, exit so the operator can fix the migration file.
		process.exit(1);
		}
	}
}

function close() {
	try {
		db.close();
	} catch (err) {
		console.warn('error closing DB:', err);
	}
}

export { db, runMigrations, close };