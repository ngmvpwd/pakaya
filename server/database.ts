import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@shared/schema";
import path from "path";

const sqlite = new Database("attendance.db");
export const db = drizzle(sqlite, { schema });

// Initialize clean production database
export function initializeDatabase() {
  // Create tables only
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      join_date TEXT
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      check_in_time TEXT,
      notes TEXT,
      recorded_by INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Only insert default admin if no users exist
  const userCount = sqlite.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  
  if (userCount.count === 0) {
    sqlite.prepare(`
      INSERT INTO users (username, password, role, name) VALUES 
      ('admin', 'admin123', 'admin', 'System Administrator')
    `).run();
    console.log("Default admin user created");
  }
}
