import { integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { pgTable, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'admin' or 'dataentry'
  name: text("name").notNull(),
});

export const teachers = pgTable("teachers", {
  id: serial("id").primaryKey(),
  teacherId: text("teacher_id").notNull().unique(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  email: text("email"),
  phone: text("phone"),
  joinDate: text("join_date"),
});

export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  status: text("status").notNull(), // 'present', 'absent', 'half_day'
  checkInTime: text("check_in_time"),
  notes: text("notes"),
  recordedBy: integer("recorded_by").notNull(), // user id who recorded
  createdAt: timestamp("created_at").defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull(),
  type: text("type").notNull(), // 'absence', 'pattern', 'extended'
  message: text("message").notNull(),
  severity: text("severity").notNull(), // 'low', 'medium', 'high'
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertTeacherSchema = createInsertSchema(teachers).omit({
  id: true,
});

export const insertAttendanceSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type Teacher = typeof teachers.$inferSelect;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type Alert = typeof alerts.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
