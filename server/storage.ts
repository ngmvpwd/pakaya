import { db } from "./db";
import { 
  users, departments, teachers, attendanceRecords, alerts,
  type User, type Department, type Teacher, type AttendanceRecord, type Alert,
  type InsertUser, type InsertDepartment, type InsertTeacher, type InsertAttendance, type InsertAlert
} from "@shared/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Department methods
  getAllDepartments(): Promise<Department[]>;
  getDepartmentById(id: number): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: number): Promise<void>;
  
  // Teacher methods
  getAllTeachers(): Promise<Teacher[]>;
  getTeacherById(id: number): Promise<Teacher | undefined>;
  getTeacherByTeacherId(teacherId: string): Promise<Teacher | undefined>;
  createTeacher(teacher: InsertTeacher): Promise<Teacher>;
  updateTeacher(id: number, teacher: Partial<InsertTeacher>): Promise<Teacher | undefined>;
  deleteTeacher(id: number): Promise<void>;
  
  // Attendance methods
  getAttendanceByDate(date: string): Promise<(AttendanceRecord & { teacher: Teacher })[]>;
  getAttendanceByTeacher(teacherId: number, startDate?: string, endDate?: string): Promise<AttendanceRecord[]>;
  createAttendanceRecord(attendance: InsertAttendance): Promise<AttendanceRecord>;
  updateAttendanceRecord(id: number, attendance: Partial<InsertAttendance>): Promise<AttendanceRecord | undefined>;
  getAttendanceStats(startDate?: string, endDate?: string): Promise<{
    totalTeachers: number;
    presentToday: number;
    absentToday: number;
    halfDayToday: number;
    attendanceRate: number;
  }>;
  getAttendanceTrends(days: number): Promise<Array<{ date: string; present: number; absent: number; halfDay: number }>>;
  getAttendanceTrendsCustomRange(startDate: string, endDate: string): Promise<Array<{ date: string; present: number; absent: number; halfDay: number }>>;
  getDepartmentStats(): Promise<Array<{ department: string; attendanceRate: number; teacherCount: number }>>;
  
  // Alert methods
  getAlerts(limit?: number): Promise<(Alert & { teacher: Teacher })[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: number): Promise<void>;
  
  // Analytics methods
  getTeacherAttendancePattern(teacherId: number, weeks: number): Promise<Array<{ week: string; rate: number }>>;
  getTopPerformingTeachers(limit: number): Promise<Array<{ teacher: Teacher; attendanceRate: number }>>;
}

export class DatabaseStorage implements IStorage {
  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async getAllDepartments(): Promise<Department[]> {
    return await db.select().from(departments).orderBy(asc(departments.name));
  }

  async getDepartmentById(id: number): Promise<Department | undefined> {
    const result = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
    return result[0];
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const result = await db.insert(departments).values(department).returning();
    return result[0];
  }

  async updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | undefined> {
    const result = await db.update(departments).set(department).where(eq(departments.id, id)).returning();
    return result[0];
  }

  async deleteDepartment(id: number): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }

  async getAllTeachers(): Promise<Teacher[]> {
    return await db.select().from(teachers).orderBy(asc(teachers.name));
  }

  async getTeacherById(id: number): Promise<Teacher | undefined> {
    const result = await db.select().from(teachers).where(eq(teachers.id, id)).limit(1);
    return result[0];
  }

  async getTeacherByTeacherId(teacherId: string): Promise<Teacher | undefined> {
    const result = await db.select().from(teachers).where(eq(teachers.teacherId, teacherId)).limit(1);
    return result[0];
  }

  async createTeacher(teacher: InsertTeacher): Promise<Teacher> {
    // Auto-generate teacher ID if not provided
    let teacherId = teacher.teacherId;
    if (!teacherId) {
      const existingTeachers = await db.select({ teacherId: teachers.teacherId }).from(teachers).orderBy(desc(teachers.teacherId));
      const lastTeacherId = existingTeachers[0]?.teacherId;
      
      let nextNumber = 1;
      if (lastTeacherId && lastTeacherId.startsWith('T')) {
        const lastNumber = parseInt(lastTeacherId.substring(1));
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
      
      teacherId = `T${String(nextNumber).padStart(3, '0')}`;
    }
    
    const teacherData = { 
      ...teacher, 
      teacherId,
      name: teacher.name,
      department: teacher.department,
      email: teacher.email || null,
      phone: teacher.phone || null,
      joinDate: teacher.joinDate || null
    } as typeof teachers.$inferInsert;
    const result = await db.insert(teachers).values(teacherData).returning();
    return result[0];
  }

  async updateTeacher(id: number, teacher: Partial<InsertTeacher>): Promise<Teacher | undefined> {
    const result = await db.update(teachers).set(teacher).where(eq(teachers.id, id)).returning();
    return result[0];
  }

  async deleteTeacher(id: number): Promise<void> {
    await db.delete(teachers).where(eq(teachers.id, id));
  }

  async getAttendanceByDate(date: string): Promise<(AttendanceRecord & { teacher: Teacher })[]> {
    const result = await db
      .select()
      .from(attendanceRecords)
      .innerJoin(teachers, eq(attendanceRecords.teacherId, teachers.id))
      .where(eq(attendanceRecords.date, date))
      .orderBy(asc(teachers.name));

    return result.map(row => ({
      id: row.attendance_records.id,
      teacherId: row.attendance_records.teacherId,
      date: row.attendance_records.date,
      status: row.attendance_records.status,
      checkInTime: row.attendance_records.checkInTime,
      notes: row.attendance_records.notes,
      recordedBy: row.attendance_records.recordedBy,
      createdAt: row.attendance_records.createdAt,
      teacher: row.teachers
    }));
  }

  async getAttendanceByTeacher(teacherId: number, startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
    if (startDate && endDate) {
      return await db.select().from(attendanceRecords).where(
        and(
          eq(attendanceRecords.teacherId, teacherId),
          sql`${attendanceRecords.date} >= ${startDate}`,
          sql`${attendanceRecords.date} <= ${endDate}`
        )
      ).orderBy(desc(attendanceRecords.date));
    }
    
    return await db.select().from(attendanceRecords)
      .where(eq(attendanceRecords.teacherId, teacherId))
      .orderBy(desc(attendanceRecords.date));
  }

  async createAttendanceRecord(attendance: InsertAttendance): Promise<AttendanceRecord> {
    const result = await db.insert(attendanceRecords).values(attendance).returning();
    return result[0];
  }

  async updateAttendanceRecord(id: number, attendance: Partial<InsertAttendance>): Promise<AttendanceRecord | undefined> {
    const result = await db.update(attendanceRecords).set(attendance).where(eq(attendanceRecords.id, id)).returning();
    return result[0];
  }

  async getAttendanceStats(startDate?: string, endDate?: string): Promise<{
    totalTeachers: number;
    presentToday: number;
    absentToday: number;
    halfDayToday: number;
    attendanceRate: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const targetDate = endDate || today;

    const totalTeachers = await db.select({ count: sql<number>`count(*)` }).from(teachers);
    
    const todayStats = await db
      .select({
        status: attendanceRecords.status,
        count: sql<number>`count(*)`
      })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.date, targetDate))
      .groupBy(attendanceRecords.status);

    const stats = {
      totalTeachers: totalTeachers[0].count,
      presentToday: 0,
      absentToday: 0,
      halfDayToday: 0,
      attendanceRate: 0,
    };

    todayStats.forEach(stat => {
      switch (stat.status) {
        case 'present':
          stats.presentToday = stat.count;
          break;
        case 'absent':
          stats.absentToday = stat.count;
          break;
        case 'half_day':
          stats.halfDayToday = stat.count;
          break;
      }
    });

    // Calculate attendance rate based on total teachers, not just recorded attendance
    if (stats.totalTeachers > 0) {
      stats.attendanceRate = Math.round(((stats.presentToday + stats.halfDayToday * 0.5) / stats.totalTeachers) * 100 * 10) / 10;
    }

    return stats;
  }

  async getAttendanceTrends(days: number): Promise<Array<{ date: string; present: number; absent: number; halfDay: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const result = await db
      .select({
        date: attendanceRecords.date,
        status: attendanceRecords.status,
        count: sql<number>`count(*)`
      })
      .from(attendanceRecords)
      .where(sql`${attendanceRecords.date} >= ${startDateStr}`)
      .groupBy(attendanceRecords.date, attendanceRecords.status)
      .orderBy(asc(attendanceRecords.date));

    const trendsMap = new Map<string, { present: number; absent: number; halfDay: number }>();
    
    result.forEach(row => {
      if (!trendsMap.has(row.date)) {
        trendsMap.set(row.date, { present: 0, absent: 0, halfDay: 0 });
      }
      const trend = trendsMap.get(row.date)!;
      
      switch (row.status) {
        case 'present':
          trend.present = row.count;
          break;
        case 'absent':
          trend.absent = row.count;
          break;
        case 'half_day':
          trend.halfDay = row.count;
          break;
      }
    });

    return Array.from(trendsMap.entries()).map(([date, stats]) => ({ date, ...stats }));
  }

  async getAttendanceTrendsCustomRange(startDate: string, endDate: string): Promise<Array<{ date: string; present: number; absent: number; halfDay: number }>> {
    const result = await db
      .select({
        date: attendanceRecords.date,
        status: attendanceRecords.status,
        count: sql<number>`count(*)`
      })
      .from(attendanceRecords)
      .where(sql`${attendanceRecords.date} >= ${startDate} AND ${attendanceRecords.date} <= ${endDate}`)
      .groupBy(attendanceRecords.date, attendanceRecords.status)
      .orderBy(asc(attendanceRecords.date));

    const trendsMap = new Map<string, { present: number; absent: number; halfDay: number }>();
    
    result.forEach(row => {
      if (!trendsMap.has(row.date)) {
        trendsMap.set(row.date, { present: 0, absent: 0, halfDay: 0 });
      }
      const trend = trendsMap.get(row.date)!;
      
      switch (row.status) {
        case 'present':
          trend.present = row.count;
          break;
        case 'absent':
          trend.absent = row.count;
          break;
        case 'half_day':
          trend.halfDay = row.count;
          break;
      }
    });

    return Array.from(trendsMap.entries()).map(([date, stats]) => ({ date, ...stats }));
  }

  async getDepartmentStats(): Promise<Array<{ department: string; attendanceRate: number; teacherCount: number }>> {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const startDate = last30Days.toISOString().split('T')[0];

    const result = await db
      .select({
        department: teachers.department,
        teacherCount: sql<number>`count(distinct ${teachers.id})`,
        totalRecords: sql<number>`count(${attendanceRecords.id})`,
        presentRecords: sql<number>`sum(case when ${attendanceRecords.status} = 'present' then 1 else 0 end)`,
        halfDayRecords: sql<number>`sum(case when ${attendanceRecords.status} = 'half_day' then 1 else 0 end)`,
      })
      .from(teachers)
      .leftJoin(attendanceRecords, eq(teachers.id, attendanceRecords.teacherId))
      .where(sql`${attendanceRecords.date} >= ${startDate}`)
      .groupBy(teachers.department);

    return result.map(row => ({
      department: row.department,
      teacherCount: row.teacherCount,
      attendanceRate: row.totalRecords > 0 
        ? Math.round(((row.presentRecords + row.halfDayRecords * 0.5) / row.totalRecords) * 100 * 10) / 10
        : 0
    }));
  }

  async getAlerts(limit = 10): Promise<(Alert & { teacher: Teacher })[]> {
    const result = await db
      .select({
        id: alerts.id,
        teacherId: alerts.teacherId,
        type: alerts.type,
        message: alerts.message,
        severity: alerts.severity,
        isRead: alerts.isRead,
        createdAt: alerts.createdAt,
        teacher: teachers,
      })
      .from(alerts)
      .innerJoin(teachers, eq(alerts.teacherId, teachers.id))
      .orderBy(desc(alerts.createdAt))
      .limit(limit);

    return result.map(row => ({
      ...row,
      teacher: row.teacher
    }));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const result = await db.insert(alerts).values(alert).returning();
    return result[0];
  }

  async markAlertAsRead(id: number): Promise<void> {
    await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, id));
  }

  async getTeacherAttendancePattern(teacherId: number, weeks: number): Promise<Array<{ week: string; rate: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeks * 7));
    const startDateStr = startDate.toISOString().split('T')[0];

    const result = await db
      .select({
        date: attendanceRecords.date,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.teacherId, teacherId),
          sql`${attendanceRecords.date} >= ${startDateStr}`
        )
      )
      .orderBy(asc(attendanceRecords.date));

    // Group by weeks and calculate rates
    const weeklyStats = new Map<string, { present: number; total: number }>();
    
    result.forEach(record => {
      const date = new Date(record.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyStats.has(weekKey)) {
        weeklyStats.set(weekKey, { present: 0, total: 0 });
      }
      
      const stats = weeklyStats.get(weekKey)!;
      stats.total++;
      if (record.status === 'present' || record.status === 'half_day') {
        stats.present += record.status === 'present' ? 1 : 0.5;
      }
    });

    return Array.from(weeklyStats.entries()).map(([week, stats]) => ({
      week,
      rate: stats.total > 0 ? Math.round((stats.present / stats.total) * 100 * 10) / 10 : 0
    }));
  }

  async getTopPerformingTeachers(limit: number): Promise<Array<{ teacher: Teacher; attendanceRate: number }>> {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const startDate = last30Days.toISOString().split('T')[0];

    const result = await db
      .select({
        teacher: teachers,
        totalRecords: sql<number>`count(${attendanceRecords.id})`,
        presentRecords: sql<number>`sum(case when ${attendanceRecords.status} = 'present' then 1 else 0 end)`,
        halfDayRecords: sql<number>`sum(case when ${attendanceRecords.status} = 'half_day' then 1 else 0 end)`,
      })
      .from(teachers)
      .leftJoin(attendanceRecords, eq(teachers.id, attendanceRecords.teacherId))
      .where(sql`${attendanceRecords.date} >= ${startDate}`)
      .groupBy(teachers.id)
      .having(sql`count(${attendanceRecords.id}) > 0`)
      .orderBy(sql`((sum(case when ${attendanceRecords.status} = 'present' then 1 else 0 end) + sum(case when ${attendanceRecords.status} = 'half_day' then 1 else 0 end) * 0.5) / count(${attendanceRecords.id})) DESC`)
      .limit(limit);

    return result.map(row => ({
      teacher: row.teacher,
      attendanceRate: row.totalRecords > 0 
        ? Math.round(((row.presentRecords + row.halfDayRecords * 0.5) / row.totalRecords) * 100 * 10) / 10
        : 0
    }));
  }
}

export const storage = new DatabaseStorage();
