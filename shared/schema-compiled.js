const { pgTable, serial, text, timestamp, integer, boolean, date } = require('drizzle-orm/pg-core');
const { createInsertSchema } = require('drizzle-zod');
const { z } = require('zod');

// Users table
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull(),
  name: text('name').notNull(),
});

// Departments table
const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Teachers table
const teachers = pgTable('teachers', {
  id: serial('id').primaryKey(),
  teacherId: text('teacher_id').notNull().unique(),
  name: text('name').notNull(),
  department: text('department').notNull(),
  email: text('email'),
  phone: text('phone'),
  joinDate: text('join_date'),
  username: text('username').unique(),
  password: text('password'),
  isPortalEnabled: boolean('is_portal_enabled').default(false),
});

// Attendance records table
const attendanceRecords = pgTable('attendance_records', {
  id: serial('id').primaryKey(),
  teacherId: integer('teacher_id').notNull(),
  date: text('date').notNull(),
  status: text('status').notNull(),
  absentCategory: text('absent_category'),
  checkInTime: text('check_in_time'),
  checkOutTime: text('check_out_time'),
  notes: text('notes'),
  recordedBy: integer('recorded_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Alerts table
const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  teacherId: integer('teacher_id').notNull(),
  type: text('type').notNull(),
  message: text('message').notNull(),
  severity: text('severity').notNull(),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Holidays table
const holidays = pgTable('holidays', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  date: text('date').notNull(),
  type: text('type').default('holiday'),
  description: text('description'),
});

module.exports = {
  users,
  departments,
  teachers,
  attendanceRecords,
  alerts,
  holidays
};