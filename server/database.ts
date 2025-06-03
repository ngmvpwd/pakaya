import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@shared/schema";
import path from "path";

const sqlite = new Database("attendance.db");
export const db = drizzle(sqlite, { schema });

// Initialize database with sample data
export function initializeDatabase() {
  // Create tables and insert sample data
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

  // Insert default users if they don't exist
  const userCount = sqlite.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  
  if (userCount.count === 0) {
    sqlite.prepare(`
      INSERT INTO users (username, password, role, name) VALUES 
      ('admin', 'admin123', 'admin', 'Admin User'),
      ('dataentry', 'data123', 'dataentry', 'Data Entry User')
    `).run();

    // Insert sample teachers
    const departments = ['Mathematics', 'Science', 'English', 'Social Studies', 'Physical Education', 'Art', 'Music'];
    
    for (let i = 1; i <= 60; i++) {
      const names = [
        'Robert Johnson', 'Maria Garcia', 'David Lee', 'Sarah Wilson', 'Michael Brown',
        'Jennifer Davis', 'Christopher Miller', 'Amanda Martinez', 'Matthew Anderson',
        'Jessica Taylor', 'Daniel Thomas', 'Ashley Jackson', 'James White', 'Emily Harris',
        'John Martin', 'Lisa Thompson', 'William Garcia', 'Karen Rodriguez', 'Richard Lewis',
        'Nancy Walker', 'Joseph Hall', 'Betty Allen', 'Thomas Young', 'Helen King',
        'Charles Wright', 'Sandra Scott', 'Steven Green', 'Donna Adams', 'Paul Baker',
        'Carol Nelson', 'Mark Carter', 'Michelle Mitchell', 'Donald Perez', 'Linda Roberts',
        'George Turner', 'Susan Phillips', 'Kenneth Campbell', 'Barbara Parker', 'Edward Evans',
        'Mary Edwards', 'Ronald Collins', 'Patricia Stewart', 'Jason Sanchez', 'Deborah Morris',
        'Anthony Rogers', 'Karen Reed', 'Joshua Cook', 'Lisa Bailey', 'Andrew Cooper',
        'Elizabeth Richardson', 'Brian Cox', 'Sharon Howard', 'Kevin Ward', 'Cynthia Torres',
        'Eric Peterson', 'Kathleen Gray', 'Jacob Ramirez', 'Amy James', 'Ryan Watson',
        'Angela Brooks', 'Alexander Kelly', 'Brenda Sanders', 'Noah Price', 'Emma Bennett'
      ];
      
      const teacherId = `T${String(i).padStart(3, '0')}`;
      const name = names[i - 1] || `Teacher ${i}`;
      const department = departments[Math.floor(Math.random() * departments.length)];
      
      sqlite.prepare(`
        INSERT INTO teachers (teacher_id, name, department, email, phone, join_date) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        teacherId,
        name,
        department,
        `${name.toLowerCase().replace(' ', '.')}@school.edu`,
        `555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        '2020-09-01'
      );
    }

    // Insert sample attendance records for the last 30 days
    const today = new Date();
    for (let day = 0; day < 30; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() - day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      for (let teacherId = 1; teacherId <= 60; teacherId++) {
        const random = Math.random();
        let status = 'present';
        let checkInTime = '09:00';
        
        if (random < 0.05) {
          status = 'absent';
          checkInTime = null;
        } else if (random < 0.10) {
          status = 'half_day';
          checkInTime = '13:00';
        } else {
          // Random check-in time between 8:30 and 9:30
          const minutes = Math.floor(Math.random() * 60) + 30; // 30-90 minutes after 8:00
          const hours = Math.floor(minutes / 60) + 8;
          const mins = minutes % 60;
          checkInTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        }
        
        sqlite.prepare(`
          INSERT INTO attendance_records (teacher_id, date, status, check_in_time, recorded_by)
          VALUES (?, ?, ?, ?, ?)
        `).run(teacherId, dateStr, status, checkInTime, 1);
      }
    }

    // Insert sample alerts
    sqlite.prepare(`
      INSERT INTO alerts (teacher_id, type, message, severity) VALUES 
      (5, 'absence', 'High absence rate this week (15%)', 'medium'),
      (12, 'extended', 'Absent for 3 consecutive days', 'high'),
      (23, 'pattern', 'Frequent late arrivals this month', 'low'),
      (34, 'absence', 'Below 80% attendance this month', 'medium')
    `).run();
  }
}
