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

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
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
  absentCategory: text("absent_category"), // 'official_leave', 'irregular_leave', 'sick_leave' (required when status is 'absent')
  checkInTime: text("check_in_time"),
  notes: text("notes"),
  recordedBy: integer("recorded_by").notNull(), // user id who recorded
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
});

export const insertTeacherSchema = createInsertSchema(teachers).omit({
  id: true,
}).extend({
  teacherId: z.string().optional(),
});

export const insertAttendanceSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).refine((data) => {
  // If status is 'absent', absentCategory is required
  if (data.status === 'absent' && !data.absentCategory) {
    return false;
  }
  // If status is not 'absent', absentCategory should be null or undefined
  if (data.status !== 'absent' && data.absentCategory) {
    return false;
  }
  return true;
}, {
  message: "Absent category is required when status is absent, and should not be provided for other statuses",
  path: ["absentCategory"]
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type Teacher = typeof teachers.$inferSelect;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type Alert = typeof alerts.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
