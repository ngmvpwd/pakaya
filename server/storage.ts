import { db } from "./db";
import { 
  users, departments, teachers, attendanceRecords, alerts, holidays,
  type User, type Department, type Teacher, type AttendanceRecord, type Alert, type Holiday,
  type InsertUser, type InsertDepartment, type InsertTeacher, type InsertAttendance, type InsertAlert, type InsertHoliday
} from "@shared/schema";
import { eq, and, or, sql, desc, asc, gte, lte, like, isNull } from "drizzle-orm";

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
  
  // Teacher portal authentication
  getTeacherByUsername(username: string): Promise<Teacher | undefined>;
  updateTeacherCredentials(id: number, credentials: { username?: string; password?: string; isPortalEnabled?: boolean }): Promise<Teacher | undefined>;
  
  // Attendance methods
  getAttendanceByDate(date: string): Promise<(AttendanceRecord & { teacher: Teacher })[]>;
  getAttendanceByTeacher(teacherId: number, startDate?: string, endDate?: string): Promise<AttendanceRecord[]>;
  createAttendanceRecord(attendance: InsertAttendance): Promise<AttendanceRecord>;
  updateAttendanceRecord(id: number, attendance: Partial<InsertAttendance>): Promise<AttendanceRecord | undefined>;
  getAttendanceRecordByTeacherAndDate(teacherId: number, date: string): Promise<AttendanceRecord | undefined>;
  getAttendanceStats(startDate?: string, endDate?: string): Promise<{
    totalTeachers: number;
    presentToday: number;
    absentToday: number;
    halfDayToday: number;
    shortLeaveToday: number;
    attendanceRate: number;
  }>;
  getAttendanceTrends(days: number): Promise<Array<{ date: string; present: number; absent: number; halfDay: number; shortLeave: number }>>;
  getAttendanceTrendsCustomRange(startDate: string, endDate: string): Promise<Array<{ date: string; present: number; absent: number; halfDay: number; shortLeave: number }>>;
  getDepartmentStats(): Promise<Array<{ department: string; attendanceRate: number; teacherCount: number }>>;
  getTeacherAbsenceTotals(teacherId: number, startDate?: string, endDate?: string): Promise<{
    totalAbsences: number;
    officialLeave: number;
    privateLeave: number;
    sickLeave: number;
    shortLeave: number;
  }>;
  getAttendanceExportData(startDate?: string, endDate?: string): Promise<Array<{
    teacherId: string;
    teacherName: string;
    department: string;
    totalAbsences: number;
    officialLeave: number;
    privateLeave: number;
    sickLeave: number;
    shortLeave: number;
    attendanceRate: number;
  }>>;
  
  // Alert methods
  getAlerts(limit?: number): Promise<(Alert & { teacher: Teacher })[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: number): Promise<void>;
  
  // Holiday methods
  getAllHolidays(): Promise<Holiday[]>;
  getHolidayByDate(date: string): Promise<Holiday | undefined>;
  getHolidaysInRange(startDate: string, endDate: string): Promise<Holiday[]>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: number, holiday: Partial<InsertHoliday>): Promise<Holiday | undefined>;
  deleteHoliday(id: number): Promise<void>;
  isHoliday(date: string): Promise<boolean>;
  
  // Analytics methods
  getTeacherAttendancePattern(teacherId: number, weeks: number): Promise<Array<{ week: string; rate: number }>>;
  getTopPerformingTeachers(limit: number): Promise<Array<{ teacher: Teacher; attendanceRate: number }>>;
  getAbsentAnalytics(startDate?: string, endDate?: string): Promise<{
    totalAbsent: number;
    officialLeave: number;
    irregularLeave: number;
    sickLeave: number;
    categorizedAbsences: Array<{ date: string; category: string; count: number }>;
  }>;
  getTeacherAbsentPattern(teacherId: number, startDate?: string, endDate?: string): Promise<Array<{
    date: string;
    status: string;
    category?: string;
  }>>;
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
    if (!teacher.teacherId) {
      const existingTeachers = await db.select({ teacherId: teachers.teacherId }).from(teachers).orderBy(teachers.teacherId);
      const nextNumber = existingTeachers.length + 1;
      teacher.teacherId = `T${String(nextNumber).padStart(3, '0')}`;
    }
    
    const result = await db.insert(teachers).values({
      teacherId: teacher.teacherId,
      name: teacher.name,
      department: teacher.department,
      email: teacher.email || null,
      phone: teacher.phone || null,
      joinDate: teacher.joinDate || null,
    }).returning();
    return result[0];
  }

  async updateTeacher(id: number, teacher: Partial<InsertTeacher>): Promise<Teacher | undefined> {
    const result = await db.update(teachers).set(teacher).where(eq(teachers.id, id)).returning();
    return result[0];
  }

  async deleteTeacher(id: number): Promise<void> {
    await db.delete(teachers).where(eq(teachers.id, id));
  }

  // Teacher portal authentication methods
  async getTeacherByUsername(username: string): Promise<Teacher | undefined> {
    const [teacher] = await db.select().from(teachers).where(eq(teachers.username, username));
    return teacher;
  }

  async updateTeacherCredentials(id: number, credentials: { username?: string; password?: string; isPortalEnabled?: boolean }): Promise<Teacher | undefined> {
    const result = await db.update(teachers).set(credentials).where(eq(teachers.id, id)).returning();
    return result[0];
  }

  async getAttendanceByDate(date: string): Promise<(AttendanceRecord & { teacher: Teacher })[]> {
    const result = await db
      .select()
      .from(attendanceRecords)
      .innerJoin(teachers, eq(attendanceRecords.teacherId, teachers.id))
      .where(eq(attendanceRecords.date, date))
      .orderBy(asc(teachers.name));
    
    return result.map(row => ({
      ...row.attendance_records,
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
    const result = await db.update(attendanceRecords).set({ ...attendance, updatedAt: new Date() }).where(eq(attendanceRecords.id, id)).returning();
    return result[0];
  }

  async getAttendanceRecordByTeacherAndDate(teacherId: number, date: string): Promise<AttendanceRecord | undefined> {
    const [record] = await db
      .select()
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.teacherId, teacherId), eq(attendanceRecords.date, date)))
      .limit(1);
    return record;
  }

  async getAttendanceStats(startDate?: string, endDate?: string): Promise<{
    totalTeachers: number;
    presentToday: number;
    absentToday: number;
    halfDayToday: number;
    shortLeaveToday: number;
    attendanceRate: number;
  }> {
    // Get today's date accounting for timezone - assume GMT+8 for school operations
    const today = new Date();
    const localDate = new Date(today.getTime() + (8 * 60 * 60 * 1000)); // GMT+8
    const todayStr = localDate.toISOString().split('T')[0];
    const targetDate = endDate || todayStr;

    const totalTeachers = await db.select({ count: sql<number>`count(*)::integer` }).from(teachers);
    
    const todayStats = await db
      .select({
        status: attendanceRecords.status,
        count: sql<number>`count(*)::integer`
      })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.date, targetDate))
      .groupBy(attendanceRecords.status);

    const stats = {
      totalTeachers: parseInt(totalTeachers[0].count.toString()),
      presentToday: 0,
      absentToday: 0,
      halfDayToday: 0,
      shortLeaveToday: 0,
      attendanceRate: 0,
    };

    todayStats.forEach(stat => {
      switch (stat.status) {
        case 'present':
          stats.presentToday = Number(stat.count);
          break;
        case 'absent':
          stats.absentToday = Number(stat.count);
          break;
        case 'half_day':
          stats.halfDayToday = Number(stat.count);
          break;
        case 'short_leave':
          stats.shortLeaveToday = Number(stat.count);
          break;
      }
    });

    // Calculate attendance rate based on total teachers, not just recorded attendance
    if (stats.totalTeachers > 0) {
      const effectivePresent = stats.presentToday + (stats.halfDayToday * 0.5) + (stats.shortLeaveToday * 0.75);
      const rate = (effectivePresent / stats.totalTeachers) * 100;
      stats.attendanceRate = Math.min(100, Math.max(0, parseFloat(rate.toFixed(2))));
    }

    return stats;
  }

  async getAttendanceTrends(days: number): Promise<Array<{ date: string; present: number; absent: number; halfDay: number; shortLeave: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const localStartDate = new Date(startDate.getTime() + (8 * 60 * 60 * 1000)); // GMT+8
    const startDateStr = localStartDate.toISOString().split('T')[0];

    // Get holidays in the date range to exclude from trends
    const holidaysInRange = await this.getHolidaysInRange(startDateStr, new Date().toISOString().split('T')[0]);
    const holidayDates = new Set(holidaysInRange.map(h => h.date));

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

    const trendsMap = new Map<string, { present: number; absent: number; halfDay: number; shortLeave: number }>();
    
    result.forEach(row => {
      // Skip holiday dates from trends
      if (holidayDates.has(row.date)) {
        return;
      }
      
      if (!trendsMap.has(row.date)) {
        trendsMap.set(row.date, { present: 0, absent: 0, halfDay: 0, shortLeave: 0 });
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
        case 'short_leave':
          trend.shortLeave = row.count;
          break;
      }
    });

    return Array.from(trendsMap.entries()).map(([date, stats]) => ({ date, ...stats }));
  }

  async getAttendanceTrendsCustomRange(startDate: string, endDate: string): Promise<Array<{ date: string; present: number; absent: number; halfDay: number; shortLeave: number }>> {
    // Get holidays in the date range to exclude from trends
    const holidaysInRange = await this.getHolidaysInRange(startDate, endDate);
    const holidayDates = new Set(holidaysInRange.map(h => h.date));

    const result = await db
      .select({
        date: attendanceRecords.date,
        status: attendanceRecords.status,
        count: sql<number>`count(*)`
      })
      .from(attendanceRecords)
      .where(and(
        sql`${attendanceRecords.date} >= ${startDate}`,
        sql`${attendanceRecords.date} <= ${endDate}`
      ))
      .groupBy(attendanceRecords.date, attendanceRecords.status)
      .orderBy(asc(attendanceRecords.date));

    const trendsMap = new Map<string, { present: number; absent: number; halfDay: number; shortLeave: number }>();
    
    result.forEach(row => {
      // Skip holiday dates from trends
      if (holidayDates.has(row.date)) {
        return;
      }
      
      if (!trendsMap.has(row.date)) {
        trendsMap.set(row.date, { present: 0, absent: 0, halfDay: 0, shortLeave: 0 });
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
        case 'short_leave':
          trend.shortLeave = row.count;
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
        shortLeaveRecords: sql<number>`sum(case when ${attendanceRecords.status} = 'short_leave' then 1 else 0 end)`,
      })
      .from(teachers)
      .leftJoin(attendanceRecords, eq(teachers.id, attendanceRecords.teacherId))
      .where(sql`${attendanceRecords.date} >= ${startDate}`)
      .groupBy(teachers.department);

    return result.map(row => {
      const totalRecords = Number(row.totalRecords) || 0;
      const presentRecords = Number(row.presentRecords) || 0;
      const halfDayRecords = Number(row.halfDayRecords) || 0;
      const shortLeaveRecords = Number(row.shortLeaveRecords) || 0;
      
      let attendanceRate = 0;
      if (totalRecords > 0) {
        const effectivePresent = presentRecords + (halfDayRecords * 0.5) + (shortLeaveRecords * 0.8);
        const rate = (effectivePresent / totalRecords) * 100;
        attendanceRate = Math.min(100, Math.max(0, parseFloat(rate.toFixed(2))));
      }
      
      return {
        department: row.department,
        teacherCount: Number(row.teacherCount) || 0,
        attendanceRate
      };
    });
  }

  async getTeacherAbsenceTotals(teacherId: number, startDate?: string, endDate?: string): Promise<{
    totalAbsences: number;
    officialLeave: number;
    privateLeave: number;
    sickLeave: number;
    shortLeave: number;
  }> {
    try {
      let query;
      if (startDate && endDate) {
        query = db
          .select({
            status: attendanceRecords.status,
            absentCategory: attendanceRecords.absentCategory,
            count: sql<number>`count(*)`
          })
          .from(attendanceRecords)
          .where(and(
            eq(attendanceRecords.teacherId, teacherId),
            sql`${attendanceRecords.date} >= ${startDate}`,
            sql`${attendanceRecords.date} <= ${endDate}`
          ));
      } else {
        query = db
          .select({
            status: attendanceRecords.status,
            absentCategory: attendanceRecords.absentCategory,
            count: sql<number>`count(*)`
          })
          .from(attendanceRecords)
          .where(eq(attendanceRecords.teacherId, teacherId));
      }
      
      const result = await query.groupBy(attendanceRecords.status, attendanceRecords.absentCategory);

      const totals = {
        totalAbsences: 0,
        officialLeave: 0,
        privateLeave: 0,
        sickLeave: 0,
        shortLeave: 0,
      };

      if (result && Array.isArray(result)) {
        result.forEach(row => {
          const count = parseInt(row.count?.toString() || '0') || 0;
          if (row.status === 'absent') {
            totals.totalAbsences += count;
            switch (row.absentCategory) {
              case 'official_leave':
                totals.officialLeave += count;
                break;
              case 'private_leave':
                totals.privateLeave += count;
                break;
              case 'sick_leave':
                totals.sickLeave += count;
                break;
            }
          } else if (row.status === 'short_leave') {
            totals.shortLeave += count;
          }
        });
      }

      return totals;
    } catch (error) {
      console.error('Error getting teacher absence totals for teacherId:', teacherId, error);
      // Return empty totals instead of throwing to prevent PDF generation failure
      return {
        totalAbsences: 0,
        officialLeave: 0,
        privateLeave: 0,
        sickLeave: 0,
        shortLeave: 0,
      };
    }
  }

  async getAttendanceExportData(startDate?: string, endDate?: string): Promise<Array<{
    teacherId: string;
    teacherName: string;
    department: string;
    totalAbsences: number;
    officialLeave: number;
    privateLeave: number;
    sickLeave: number;
    shortLeave: number;
    attendanceRate: number;
  }>> {
    // Simplified approach - get all teachers first, then aggregate data
    const allTeachers = await db.select().from(teachers).orderBy(asc(teachers.name));
    const exportData = [];
    
    for (const teacher of allTeachers) {
      // Get attendance records for this teacher
      let whereConditions = [eq(attendanceRecords.teacherId, teacher.id)];

      if (startDate && endDate) {
        whereConditions.push(
          sql`${attendanceRecords.date} >= ${startDate}`,
          sql`${attendanceRecords.date} <= ${endDate}`
        );
      }

      let records;
      if (startDate && endDate) {
        records = await db
          .select()
          .from(attendanceRecords)
          .where(and(
            eq(attendanceRecords.teacherId, teacher.id),
            sql`${attendanceRecords.date} >= ${startDate}`,
            sql`${attendanceRecords.date} <= ${endDate}`
          ));
      } else {
        records = await db
          .select()
          .from(attendanceRecords)
          .where(eq(attendanceRecords.teacherId, teacher.id));
      }
      
      // Calculate statistics
      let totalRecords = records.length;
      let presentRecords = 0;
      let halfDayRecords = 0;
      let shortLeaveRecords = 0;
      let totalAbsences = 0;
      let officialLeave = 0;
      let privateLeave = 0;
      let sickLeave = 0;

      records.forEach(record => {
        switch (record.status) {
          case 'present':
            presentRecords++;
            break;
          case 'half_day':
            halfDayRecords++;
            break;
          case 'short_leave':
            shortLeaveRecords++;
            break;
          case 'absent':
            totalAbsences++;
            switch (record.absentCategory) {
              case 'official_leave':
                officialLeave++;
                break;
              case 'private_leave':
                privateLeave++;
                break;
              case 'sick_leave':
                sickLeave++;
                break;
            }
            break;
        }
      });

      // Calculate attendance rate
      let attendanceRate = 0;
      if (totalRecords > 0) {
        const effectivePresent = presentRecords + (halfDayRecords * 0.5) + (shortLeaveRecords * 0.8);
        const rate = (effectivePresent / totalRecords) * 100;
        attendanceRate = Math.min(100, Math.max(0, parseFloat(rate.toFixed(2))));
      }

      exportData.push({
        teacherId: teacher.teacherId,
        teacherName: teacher.name,
        department: teacher.department,
        totalAbsences,
        officialLeave,
        privateLeave,
        sickLeave,
        shortLeave: shortLeaveRecords,
        attendanceRate,
      });
    }

    return exportData;
  }

  async getAlerts(limit = 10): Promise<(Alert & { teacher: Teacher })[]> {
    const result = await db
      .select()
      .from(alerts)
      .innerJoin(teachers, eq(alerts.teacherId, teachers.id))
      .where(eq(alerts.isRead, false))
      .orderBy(desc(alerts.createdAt))
      .limit(limit);
    
    return result.map(row => ({
      ...row.alerts,
      teacher: row.teachers
    }));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const result = await db.insert(alerts).values(alert).returning();
    return result[0];
  }

  async markAlertAsRead(id: number): Promise<void> {
    await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, id));
  }

  // Holiday methods
  async getAllHolidays(): Promise<Holiday[]> {
    return await db.select().from(holidays).orderBy(asc(holidays.date));
  }

  async getHolidayByDate(date: string): Promise<Holiday | undefined> {
    const result = await db.select().from(holidays).where(eq(holidays.date, date)).limit(1);
    return result[0];
  }

  async getHolidaysInRange(startDate: string, endDate: string): Promise<Holiday[]> {
    return await db
      .select()
      .from(holidays)
      .where(and(
        sql`${holidays.date} >= ${startDate}`,
        sql`${holidays.date} <= ${endDate}`
      ))
      .orderBy(asc(holidays.date));
  }

  async createHoliday(holiday: InsertHoliday): Promise<Holiday> {
    const result = await db.insert(holidays).values(holiday).returning();
    return result[0];
  }

  async updateHoliday(id: number, holiday: Partial<InsertHoliday>): Promise<Holiday | undefined> {
    const result = await db.update(holidays).set(holiday).where(eq(holidays.id, id)).returning();
    return result[0];
  }

  async deleteHoliday(id: number): Promise<void> {
    await db.delete(holidays).where(eq(holidays.id, id));
  }

  async isHoliday(date: string): Promise<boolean> {
    const result = await db.select({ id: holidays.id }).from(holidays).where(eq(holidays.date, date)).limit(1);
    return result.length > 0;
  }

  async getTeacherAttendancePattern(teacherId: number, weeks: number): Promise<Array<{ week: string; rate: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeks * 7));
    const startDateStr = startDate.toISOString().split('T')[0];

    const result = await db
      .select({
        date: attendanceRecords.date,
        status: attendanceRecords.status
      })
      .from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.teacherId, teacherId),
        sql`${attendanceRecords.date} >= ${startDateStr}`
      ))
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
      if (record.status === 'present' || record.status === 'half_day' || record.status === 'short_leave') {
        stats.present += record.status === 'present' ? 1 : record.status === 'short_leave' ? 0.8 : 0.5;
      }
    });

    return Array.from(weeklyStats.entries()).map(([week, stats]) => {
      let rate = 0;
      if (stats.total > 0) {
        const percentage = (stats.present / stats.total) * 100;
        rate = Math.min(100, Math.max(0, Math.round(percentage * 10) / 10));
      }
      return {
        week,
        rate
      };
    });
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
        shortLeaveRecords: sql<number>`sum(case when ${attendanceRecords.status} = 'short_leave' then 1 else 0 end)`,
      })
      .from(teachers)
      .leftJoin(attendanceRecords, eq(teachers.id, attendanceRecords.teacherId))
      .where(sql`${attendanceRecords.date} >= ${startDate}`)
      .groupBy(teachers.id)
      .having(sql`count(${attendanceRecords.id}) > 0`)
      .orderBy(sql`((sum(case when ${attendanceRecords.status} = 'present' then 1 else 0 end) + sum(case when ${attendanceRecords.status} = 'half_day' then 1 else 0 end) * 0.5 + sum(case when ${attendanceRecords.status} = 'short_leave' then 1 else 0 end) * 0.8) / count(${attendanceRecords.id})) DESC`)
      .limit(limit);

    return result.map(row => {
      const totalRecords = Number(row.totalRecords) || 0;
      const presentRecords = Number(row.presentRecords) || 0;
      const halfDayRecords = Number(row.halfDayRecords) || 0;
      const shortLeaveRecords = Number(row.shortLeaveRecords) || 0;
      
      let attendanceRate = 0;
      if (totalRecords > 0) {
        const effectivePresent = presentRecords + (halfDayRecords * 0.5) + (shortLeaveRecords * 0.8);
        const rate = (effectivePresent / totalRecords) * 100;
        attendanceRate = Math.min(100, Math.max(0, Math.round(rate)));
      }
      
      return {
        teacher: row.teacher,
        attendanceRate
      };
    });
  }

  async getAbsentAnalytics(startDate?: string, endDate?: string): Promise<{
    totalAbsent: number;
    officialLeave: number;
    irregularLeave: number;
    sickLeave: number;
    categorizedAbsences: Array<{ date: string; category: string; count: number }>;
  }> {
    let whereConditions = [eq(attendanceRecords.status, 'absent')];

    if (startDate && endDate) {
      whereConditions.push(
        sql`${attendanceRecords.date} >= ${startDate}`,
        sql`${attendanceRecords.date} <= ${endDate}`
      );
    }

    let query;
    if (startDate && endDate) {
      query = db
        .select({
          date: attendanceRecords.date,
          absentCategory: attendanceRecords.absentCategory,
          count: sql<number>`count(*)`
        })
        .from(attendanceRecords)
        .where(and(
          eq(attendanceRecords.status, 'absent'),
          sql`${attendanceRecords.date} >= ${startDate}`,
          sql`${attendanceRecords.date} <= ${endDate}`
        ));
    } else {
      query = db
        .select({
          date: attendanceRecords.date,
          absentCategory: attendanceRecords.absentCategory,
          count: sql<number>`count(*)`
        })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.status, 'absent'));
    }
    
    const result = await query.groupBy(attendanceRecords.date, attendanceRecords.absentCategory);

    let totalAbsent = 0;
    let officialLeave = 0;
    let irregularLeave = 0;
    let sickLeave = 0;
    const categorizedAbsences: Array<{ date: string; category: string; count: number }> = [];

    result.forEach(row => {
      const count = parseInt(row.count.toString()) || 0;
      totalAbsent += count;
      const category = row.absentCategory || 'irregular_leave';
      
      switch (category) {
        case 'official_leave':
          officialLeave += count;
          break;
        case 'private_leave':
        case 'irregular_leave':
          irregularLeave += count;
          break;
        case 'sick_leave':
          sickLeave += count;
          break;
      }

      categorizedAbsences.push({
        date: row.date,
        category,
        count: count
      });
    });

    return {
      totalAbsent,
      officialLeave,
      irregularLeave,
      sickLeave,
      categorizedAbsences
    };
  }

  async getTeacherAbsentPattern(teacherId: number, startDate?: string, endDate?: string): Promise<Array<{
    date: string;
    status: string;
    category?: string;
  }>> {
    let whereConditions = [eq(attendanceRecords.teacherId, teacherId)];

    if (startDate && endDate) {
      whereConditions.push(
        sql`${attendanceRecords.date} >= ${startDate}`,
        sql`${attendanceRecords.date} <= ${endDate}`
      );
    }

    let query;
    if (startDate && endDate) {
      query = db
        .select({
          date: attendanceRecords.date,
          status: attendanceRecords.status,
          absentCategory: attendanceRecords.absentCategory
        })
        .from(attendanceRecords)
        .where(and(
          eq(attendanceRecords.teacherId, teacherId),
          sql`${attendanceRecords.date} >= ${startDate}`,
          sql`${attendanceRecords.date} <= ${endDate}`
        ));
    } else {
      query = db
        .select({
          date: attendanceRecords.date,
          status: attendanceRecords.status,
          absentCategory: attendanceRecords.absentCategory
        })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.teacherId, teacherId));
    }
    
    const result = await query.orderBy(desc(attendanceRecords.date));

    return result.map(row => ({
      date: row.date,
      status: row.status,
      category: row.absentCategory || undefined
    }));
  }
}

export const storage = new DatabaseStorage();