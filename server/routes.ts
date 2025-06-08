import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertAttendanceSchema, insertTeacherSchema, insertDepartmentSchema, insertHolidaySchema } from "@shared/schema";
import { db } from "./db";
import * as schema from "@shared/schema";
import { z } from "zod";
import { sql } from "drizzle-orm";
import puppeteer from "puppeteer";

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const bulkAttendanceSchema = z.object({
  date: z.string(),
  records: z.array(z.object({
    teacherId: z.number(),
    status: z.enum(['present', 'absent', 'half_day', 'short_leave']),
    checkInTime: z.string().optional(),
    checkOutTime: z.string().optional(),
    absentCategory: z.enum(['official_leave', 'private_leave', 'sick_leave']).optional(),
    notes: z.string().optional(),
  })),
  recordedBy: z.number(),
});

// WebSocket clients storage
const wsClients = new Set<WebSocket>();

// Broadcast function for real-time updates
function broadcastUpdate(type: string, data: any) {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // In a real app, you'd use proper session management or JWT
      // For now, just return user data
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Department routes
  app.get("/api/departments", async (req, res) => {
    try {
      const departments = await storage.getAllDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.post("/api/departments", async (req, res) => {
    try {
      const departmentData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(departmentData);
      res.json(department);
    } catch (error) {
      res.status(400).json({ message: "Invalid department data" });
    }
  });

  app.put("/api/departments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const departmentData = insertDepartmentSchema.partial().parse(req.body);
      const department = await storage.updateDepartment(id, departmentData);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      res.status(400).json({ message: "Invalid department data" });
    }
  });

  app.delete("/api/departments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDepartment(id);
      res.json({ message: "Department deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete department" });
    }
  });

  // Teacher routes
  app.get("/api/teachers", async (req, res) => {
    try {
      const teachers = await storage.getAllTeachers();
      res.json(teachers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teachers" });
    }
  });

  app.get("/api/teachers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const teacher = await storage.getTeacherById(id);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      res.json(teacher);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teacher" });
    }
  });

  app.post("/api/teachers", async (req, res) => {
    try {
      const teacherData = insertTeacherSchema.parse(req.body);
      const teacher = await storage.createTeacher(teacherData);
      
      // Broadcast real-time update
      broadcastUpdate('teacher_updated', { action: 'created', teacher });
      
      res.json(teacher);
    } catch (error) {
      res.status(400).json({ message: "Invalid teacher data" });
    }
  });

  app.put("/api/teachers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const teacherData = insertTeacherSchema.partial().parse(req.body);
      const teacher = await storage.updateTeacher(id, teacherData);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      res.json(teacher);
    } catch (error) {
      res.status(400).json({ message: "Invalid teacher data" });
    }
  });

  app.delete("/api/teachers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTeacher(id);
      res.json({ message: "Teacher deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete teacher" });
    }
  });

  // Attendance routes
  app.get("/api/attendance/date", async (req, res) => {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const attendance = await storage.getAttendanceByDate(date);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  app.get("/api/attendance/teacher/:teacherId", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const { startDate, endDate } = req.query;
      
      const attendance = await storage.getAttendanceByTeacher(
        teacherId,
        startDate as string,
        endDate as string
      );
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teacher attendance" });
    }
  });

  app.post("/api/attendance", async (req, res) => {
    try {
      const attendanceData = insertAttendanceSchema.parse(req.body);
      
      // Check if record already exists for this teacher and date
      const existingRecord = await storage.getAttendanceRecordByTeacherAndDate(
        attendanceData.teacherId,
        attendanceData.date
      );
      
      if (existingRecord) {
        // Update existing record
        const updated = await storage.updateAttendanceRecord(existingRecord.id, attendanceData);
        res.json(updated);
      } else {
        // Create new record
        const record = await storage.createAttendanceRecord(attendanceData);
        res.json(record);
      }
    } catch (error: any) {
      console.error('Attendance creation error:', error);
      res.status(400).json({ message: "Invalid attendance data", error: error.message });
    }
  });

  app.put("/api/attendance/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const attendanceData = req.body;
      const updated = await storage.updateAttendanceRecord(id, attendanceData);
      
      if (!updated) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error('Attendance update error:', error);
      res.status(400).json({ message: "Invalid attendance data", error: error.message });
    }
  });

  app.post("/api/attendance/bulk", async (req, res) => {
    try {
      const { date, records, recordedBy } = bulkAttendanceSchema.parse(req.body);
      
      const results = [];
      for (const record of records) {
        // Check if record already exists for this teacher and date
        const existingRecord = await storage.getAttendanceRecordByTeacherAndDate(
          record.teacherId,
          date
        );
        
        if (existingRecord) {
          // Update existing record
          const updated = await storage.updateAttendanceRecord(existingRecord.id, {
            status: record.status,
            checkInTime: record.checkInTime || null,
            checkOutTime: record.checkOutTime || null,
            absentCategory: record.absentCategory || null,
            notes: record.notes || null,
          });
          results.push(updated);
        } else {
          // Create new record
          const attendanceRecord = await storage.createAttendanceRecord({
            teacherId: record.teacherId,
            date,
            status: record.status,
            checkInTime: record.checkInTime || null,
            checkOutTime: record.checkOutTime || null,
            absentCategory: record.absentCategory || null,
            notes: record.notes || null,
            recordedBy,
          });
          results.push(attendanceRecord);
        }
      }
      
      // Broadcast real-time update to all connected clients
      const stats = await storage.getAttendanceStats();
      broadcastUpdate('attendance_updated', {
        stats,
        affectedDate: date,
        recordsCount: results.length
      });
      
      res.json(results);
    } catch (error) {
      res.status(400).json({ message: "Invalid bulk attendance data" });
    }
  });



  // Statistics and analytics routes
  app.get("/api/stats/overview", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const stats = await storage.getAttendanceStats(
        startDate as string,
        endDate as string
      );
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/stats/trends", async (req, res) => {
    try {
      const { days, startDate, endDate } = req.query;
      
      if (startDate && endDate) {
        // Custom date range
        const trends = await storage.getAttendanceTrendsCustomRange(
          startDate as string,
          endDate as string
        );
        res.json(trends);
      } else {
        // Default days-based range
        const daysNumber = parseInt(days as string) || 7;
        const trends = await storage.getAttendanceTrends(daysNumber);
        res.json(trends);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trends" });
    }
  });

  app.get("/api/stats/departments", async (req, res) => {
    try {
      const stats = await storage.getDepartmentStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch department stats" });
    }
  });

  app.get("/api/stats/teacher/:teacherId/pattern", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const weeks = parseInt(req.query.weeks as string) || 4;
      
      const pattern = await storage.getTeacherAttendancePattern(teacherId, weeks);
      res.json(pattern);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teacher pattern" });
    }
  });

  app.get("/api/stats/top-performers", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topPerformers = await storage.getTopPerformingTeachers(limit);
      res.json(topPerformers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch top performers" });
    }
  });

  app.get("/api/analytics/absent", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const absentAnalytics = await storage.getAbsentAnalytics(startDate as string, endDate as string);
      res.json(absentAnalytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch absent analytics" });
    }
  });

  app.get("/api/analytics/teacher/:teacherId/absent-pattern", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const { startDate, endDate } = req.query;
      
      const pattern = await storage.getTeacherAbsentPattern(teacherId, startDate as string, endDate as string);
      res.json(pattern);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teacher absent pattern" });
    }
  });

  app.get("/api/analytics/teacher/:teacherId/absence-totals", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const { startDate, endDate } = req.query;
      
      const totals = await storage.getTeacherAbsenceTotals(teacherId, startDate as string, endDate as string);
      res.json(totals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teacher absence totals" });
    }
  });

  // Alerts routes
  app.get("/api/alerts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const alerts = await storage.getAlerts(limit);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.put("/api/alerts/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markAlertAsRead(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark alert as read" });
    }
  });

  // Holiday routes
  app.get("/api/holidays", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (startDate && endDate) {
        const holidays = await storage.getHolidaysInRange(startDate as string, endDate as string);
        res.json(holidays);
      } else {
        const holidays = await storage.getAllHolidays();
        res.json(holidays);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch holidays" });
    }
  });

  app.get("/api/holidays/:date", async (req, res) => {
    try {
      const date = req.params.date;
      const holiday = await storage.getHolidayByDate(date);
      res.json(holiday || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch holiday" });
    }
  });

  app.get("/api/holidays/:date/check", async (req, res) => {
    try {
      const date = req.params.date;
      const isHoliday = await storage.isHoliday(date);
      res.json({ isHoliday });
    } catch (error) {
      res.status(500).json({ message: "Failed to check holiday" });
    }
  });

  app.post("/api/holidays", async (req, res) => {
    try {
      const holidayData = insertHolidaySchema.parse(req.body);
      const holiday = await storage.createHoliday(holidayData);
      
      // Broadcast holiday update to all connected clients
      broadcastUpdate('holiday_created', holiday);
      
      res.json(holiday);
    } catch (error: any) {
      console.error('Holiday creation error:', error);
      res.status(400).json({ message: "Invalid holiday data", error: error.message });
    }
  });

  app.put("/api/holidays/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const holidayData = req.body;
      const updated = await storage.updateHoliday(id, holidayData);
      
      if (!updated) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      
      // Broadcast holiday update to all connected clients
      broadcastUpdate('holiday_updated', updated);
      
      res.json(updated);
    } catch (error: any) {
      console.error('Holiday update error:', error);
      res.status(400).json({ message: "Invalid holiday data", error: error.message });
    }
  });

  app.delete("/api/holidays/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteHoliday(id);
      
      // Broadcast holiday deletion to all connected clients
      broadcastUpdate('holiday_deleted', { id });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete holiday" });
    }
  });

  // New endpoint for attendance data (without PDF generation)
  app.get("/api/export/attendance-data", async (req, res) => {
    try {
      const { startDate, endDate, teacherId } = req.query;
      
      const exportData = await storage.getAttendanceExportData(
        startDate as string,
        endDate as string
      );
      
      res.json(exportData);
    } catch (error) {
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Backup routes
  app.get("/api/backup/stats", async (req, res) => {
    try {
      const teachers = await storage.getAllTeachers();
      const departments = await storage.getAllDepartments();
      const holidays = await storage.getAllHolidays();
      const alerts = await storage.getAlerts(1000); // Get all alerts for count
      
      // Get attendance records count
      const attendanceRecords = await db.select().from(schema.attendanceRecords);
      const users = await db.select().from(schema.users);
      
      res.json({
        teachers: teachers.length,
        departments: departments.length,
        attendanceRecords: attendanceRecords.length,
        holidays: holidays.length,
        alerts: alerts.length,
        users: users.length,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get backup stats" });
    }
  });

  app.post("/api/backup/create", async (req, res) => {
    try {
      // Create comprehensive backup
      const backup = {
        metadata: {
          version: "1.0",
          createdAt: new Date().toISOString(),
          school: "School Attendance Management System",
          description: "Complete database backup including all tables and data"
        },
        data: {
          users: await db.select().from(schema.users),
          departments: await storage.getAllDepartments(),
          teachers: await storage.getAllTeachers(),
          attendanceRecords: await db.select().from(schema.attendanceRecords),
          holidays: await storage.getAllHolidays(),
          alerts: await storage.getAlerts(10000), // Get all alerts
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="school-attendance-backup-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(backup);
    } catch (error) {
      console.error('Backup creation error:', error);
      res.status(500).json({ message: "Failed to create backup" });
    }
  });

  app.post("/api/backup/restore", async (req, res) => {
    try {
      const backup = req.body;

      // Validate backup structure
      if (!backup.metadata || !backup.data) {
        return res.status(400).json({ message: "Invalid backup file format" });
      }

      // Clear existing data first
      await db.delete(schema.attendanceRecords);
      await db.delete(schema.alerts);
      await db.delete(schema.holidays);
      await db.delete(schema.teachers);
      await db.delete(schema.departments);
      await db.delete(schema.users);

      // Restore data in correct order (respecting foreign key constraints)
      if (backup.data.users && backup.data.users.length > 0) {
        await db.insert(schema.users).values(backup.data.users);
      }

      if (backup.data.departments && backup.data.departments.length > 0) {
        await db.insert(schema.departments).values(backup.data.departments);
      }

      if (backup.data.teachers && backup.data.teachers.length > 0) {
        await db.insert(schema.teachers).values(backup.data.teachers);
      }

      if (backup.data.holidays && backup.data.holidays.length > 0) {
        await db.insert(schema.holidays).values(backup.data.holidays);
      }

      if (backup.data.attendanceRecords && backup.data.attendanceRecords.length > 0) {
        await db.insert(schema.attendanceRecords).values(backup.data.attendanceRecords);
      }

      if (backup.data.alerts && backup.data.alerts.length > 0) {
        await db.insert(schema.alerts).values(backup.data.alerts);
      }

      // Broadcast restore completion to all connected clients
      broadcastUpdate('database_restored', { 
        timestamp: new Date().toISOString(),
        recordsRestored: {
          users: backup.data.users?.length || 0,
          departments: backup.data.departments?.length || 0,
          teachers: backup.data.teachers?.length || 0,
          attendanceRecords: backup.data.attendanceRecords?.length || 0,
          holidays: backup.data.holidays?.length || 0,
          alerts: backup.data.alerts?.length || 0,
        }
      });

      res.json({ 
        message: "Database restored successfully",
        restoredAt: new Date().toISOString(),
        recordsRestored: {
          users: backup.data.users?.length || 0,
          departments: backup.data.departments?.length || 0,
          teachers: backup.data.teachers?.length || 0,
          attendanceRecords: backup.data.attendanceRecords?.length || 0,
          holidays: backup.data.holidays?.length || 0,
          alerts: backup.data.alerts?.length || 0,
        }
      });
    } catch (error) {
      console.error('Backup restore error:', error);
      res.status(500).json({ message: "Failed to restore backup: " + (error as Error).message });
    }
  });

  // Export routes with absence totals - optimized for performance
  app.get("/api/export/attendance", async (req, res) => {
    try {
      const { format, startDate, endDate } = req.query;
      
      // Get data once for both formats
      const exportData = await storage.getAttendanceExportData(
        startDate as string,
        endDate as string
      );
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
        
        let csvData = 'Teacher ID,Teacher Name,Department,Total Absences,Official Leave,Private Leave,Sick Leave,Short Leave,Attendance Rate\n';
        
        exportData.forEach(data => {
          csvData += `${data.teacherId},"${data.teacherName}","${data.department}",${data.totalAbsences},${data.officialLeave},${data.privateLeave},${data.sickLeave},${data.shortLeave},${data.attendanceRate.toFixed(2)}%\n`;
        });
        
        res.send(csvData);
      } else if (format === 'pdf') {
        try {
          
          // Generate HTML content for PDF conversion
          const periodText = startDate && endDate 
            ? `Report Period: ${new Date(startDate as string).toLocaleDateString()} to ${new Date(endDate as string).toLocaleDateString()}`
            : 'All Available Records';

          // Add summary statistics
          const totalTeachers = exportData.length;
          const avgAttendanceRate = exportData.reduce((sum, data) => sum + data.attendanceRate, 0) / totalTeachers;
          const totalAbsences = exportData.reduce((sum, data) => sum + data.totalAbsences, 0);

          const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007BFF; padding-bottom: 20px; }
              .title { font-size: 28px; font-weight: bold; color: #007BFF; margin-bottom: 10px; }
              .subtitle { font-size: 16px; color: #666; margin: 5px 0; }
              .section { margin: 25px 0; }
              .section h3 { color: #007BFF; font-size: 20px; margin-bottom: 15px; }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 20px 0; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 12px 8px; 
                text-align: left; 
                font-size: 12px;
              }
              th { 
                background: linear-gradient(135deg, #007BFF, #0056b3); 
                color: white; 
                font-weight: bold; 
                text-align: center;
              }
              tr:nth-child(even) { background-color: #f8f9fa; }
              tr:hover { background-color: #e7f3ff; }
              .footer { 
                margin-top: 40px; 
                font-size: 10px; 
                color: #888; 
                text-align: center; 
                border-top: 1px solid #ddd; 
                padding-top: 15px;
              }
              .stats { 
                display: flex; 
                justify-content: space-around; 
                margin: 20px 0; 
                text-align: center;
              }
              .stat-item { 
                background: #f8f9fa; 
                padding: 15px; 
                border-radius: 8px; 
                border-left: 4px solid #007BFF;
              }
              .stat-number { font-size: 24px; font-weight: bold; color: #007BFF; }
              .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">School Attendance Management System</div>
              <div class="subtitle">Comprehensive Attendance Report</div>
              <div class="subtitle">Generated on ${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</div>
            </div>
            
            <div class="section">
              <h3>Report Summary</h3>
              <p style="font-size: 14px; color: #666;">${periodText}</p>
              <div class="stats">
                <div class="stat-item">
                  <div class="stat-number">${totalTeachers}</div>
                  <div class="stat-label">Total Teachers</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number">${avgAttendanceRate.toFixed(1)}%</div>
                  <div class="stat-label">Average Attendance</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number">${totalAbsences}</div>
                  <div class="stat-label">Total Absences</div>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h3>Detailed Teacher Attendance Report</h3>
              <table>
                <thead>
                  <tr>
                    <th>Teacher ID</th>
                    <th>Teacher Name</th>
                    <th>Department</th>
                    <th>Total Absences</th>
                    <th>Official Leave</th>
                    <th>Private Leave</th>
                    <th>Sick Leave</th>
                    <th>Short Leave</th>
                    <th>Attendance Rate</th>
                  </tr>
                </thead>
                <tbody>
                  ${exportData.map(data => {
                    const rateColor = data.attendanceRate >= 90 ? '#28a745' : 
                                     data.attendanceRate >= 75 ? '#ffc107' : '#dc3545';
                    return `
                    <tr>
                      <td style="font-weight: bold;">${data.teacherId}</td>
                      <td>${data.teacherName}</td>
                      <td>${data.department}</td>
                      <td style="text-align: center;">${data.totalAbsences}</td>
                      <td style="text-align: center;">${data.officialLeave}</td>
                      <td style="text-align: center;">${data.privateLeave}</td>
                      <td style="text-align: center;">${data.sickLeave}</td>
                      <td style="text-align: center;">${data.shortLeave}</td>
                      <td style="text-align: center; color: ${rateColor}; font-weight: bold;">${data.attendanceRate.toFixed(1)}%</td>
                    </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
            
            <div class="footer">
              <p>This report was generated automatically by the School Attendance Management System</p>
              <p>Report contains data for ${totalTeachers} teachers across all departments</p>
              <p>For questions or concerns, please contact the administration office</p>
            </div>
          </body>
          </html>
          `;

          // Generate PDF using Puppeteer
          const browser = await puppeteer.launch({
            headless: true,
            executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
            args: [
              '--no-sandbox', 
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--single-process',
              '--disable-gpu'
            ]
          });
          
          const page = await browser.newPage();
          await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
          
          const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: {
              top: '20mm',
              right: '15mm',
              bottom: '20mm',
              left: '15mm'
            },
            printBackground: true,
            preferCSSPageSize: true
          });
          
          await browser.close();
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${new Date().toISOString().split('T')[0]}.pdf"`);
          res.send(pdfBuffer);
          
        } catch (pdfError) {
          console.error('PDF generation error:', pdfError);
          res.status(500).json({ message: "Failed to generate PDF. Please try CSV export instead." });
        }
      } else {
        res.status(400).json({ message: "Unsupported export format. Use 'csv' or 'pdf'" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Teacher-specific PDF export endpoint
  app.post("/api/export/teacher-pdf", async (req, res) => {
    try {
      const { teacher, attendanceData, stats, absenceTotals, attendancePattern } = req.body;

      if (!teacher || !attendanceData) {
        return res.status(400).json({ message: "Teacher and attendance data required" });
      }

      // Format attendance data for display
      const formatStatus = (status: string, date?: string) => {
        switch (status) {
          case 'present': return 'Present';
          case 'half_day': return 'Half Day';
          case 'short_leave': return 'Short Leave';
          case 'absent': return 'Absent';
          default: return 'No Data';
        }
      };

      // Calculate attendance rate
      const attendanceRate = stats.total > 0 
        ? Math.round(((stats.present + stats.halfDay * 0.5) / stats.total) * 100 * 10) / 10
        : 0;

      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007BFF; padding-bottom: 20px; }
          .title { font-size: 28px; font-weight: bold; color: #007BFF; margin-bottom: 10px; }
          .subtitle { font-size: 16px; color: #666; margin: 5px 0; }
          .teacher-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
          .stat-card { background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; text-align: center; }
          .stat-number { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .stat-label { font-size: 12px; color: #666; }
          .present { color: #28a745; }
          .half-day { color: #ffc107; }
          .absent { color: #dc3545; }
          .rate { color: #007bff; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
            font-size: 11px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
          }
          th { 
            background: #007BFF; 
            color: white; 
            font-weight: bold; 
            text-align: center;
          }
          tr:nth-child(even) { background-color: #f8f9fa; }
          .section { margin: 25px 0; }
          .section h3 { color: #007BFF; font-size: 18px; margin-bottom: 15px; }
          .footer { 
            margin-top: 40px; 
            font-size: 10px; 
            color: #888; 
            text-align: center; 
            border-top: 1px solid #ddd; 
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Teacher Attendance Report</div>
          <div class="subtitle">Generated on ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="teacher-info">
          <h2>${teacher.name}</h2>
          <p><strong>Teacher ID:</strong> ${teacher.teacherId}</p>
          <p><strong>Department:</strong> ${teacher.department}</p>
          <p><strong>Email:</strong> ${teacher.email || 'Not provided'}</p>
          <p><strong>Phone:</strong> ${teacher.phone || 'Not provided'}</p>
          <p><strong>Join Date:</strong> ${teacher.joinDate || 'Not provided'}</p>
        </div>

        <div class="section">
          <h3>Attendance Summary</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number present">${stats.present}</div>
              <div class="stat-label">Present Days</div>
            </div>
            <div class="stat-card">
              <div class="stat-number half-day">${stats.halfDay}</div>
              <div class="stat-label">Half Days</div>
            </div>
            <div class="stat-card">
              <div class="stat-number absent">${stats.absent}</div>
              <div class="stat-label">Absent Days</div>
            </div>
            <div class="stat-card">
              <div class="stat-number rate">${attendanceRate}%</div>
              <div class="stat-label">Attendance Rate</div>
            </div>
          </div>
        </div>

        ${absenceTotals ? `
        <div class="section">
          <h3>Absence Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Official Leave</td><td>${absenceTotals.officialLeave}</td></tr>
              <tr><td>Private Leave</td><td>${absenceTotals.privateLeave}</td></tr>
              <tr><td>Sick Leave</td><td>${absenceTotals.sickLeave}</td></tr>
              <tr><td>Short Leave</td><td>${absenceTotals.shortLeave}</td></tr>
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="section">
          <h3>Attendance Records</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${attendanceData.slice(0, 50).map((record: any) => `
                <tr>
                  <td>${new Date(record.date).toLocaleDateString()}</td>
                  <td>${formatStatus(record.status, record.date)}</td>
                  <td>${record.checkInTime || '--'}</td>
                  <td>${record.checkOutTime || '--'}</td>
                  <td>${record.notes || '--'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${attendanceData.length > 50 ? `<p><em>Showing recent 50 records. Total records: ${attendanceData.length}</em></p>` : ''}
        </div>
        
        <div class="footer">
          <p>This report was generated automatically by the School Attendance Management System</p>
          <p>Report contains ${attendanceData.length} attendance records for ${teacher.name}</p>
        </div>
      </body>
      </html>
      `;

      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        printBackground: true,
        preferCSSPageSize: true
      });
      
      await browser.close();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${teacher.name.replace(/\s+/g, '_')}_attendance_report.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('Teacher PDF generation error:', error);
      res.status(500).json({ message: "Failed to generate PDF report" });
    }
  });

  // Teacher credentials management
  app.patch("/api/teachers/:id/credentials", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { username, password, isPortalEnabled } = req.body;

      const credentials: any = { isPortalEnabled };
      if (username) credentials.username = username;
      if (password) credentials.password = password;

      const updatedTeacher = await storage.updateTeacherCredentials(id, credentials);
      
      if (!updatedTeacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      res.json(updatedTeacher);
    } catch (error) {
      console.error('Update credentials error:', error);
      res.status(500).json({ message: "Failed to update teacher credentials" });
    }
  });

  // Teacher portal authentication
  app.post("/api/teacher-portal/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const teacher = await storage.getTeacherByUsername(username);
      
      if (!teacher || teacher.password !== password || !teacher.isPortalEnabled) {
        return res.status(401).json({ message: "Invalid credentials or portal access disabled" });
      }

      // Return teacher data without password
      const { password: _, ...teacherData } = teacher;
      res.json(teacherData);
    } catch (error) {
      console.error('Teacher login error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Teacher portal attendance data
  app.get("/api/teacher-portal/attendance/:teacherId", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const attendanceData = await storage.getAttendanceByTeacher(teacherId);
      res.json(attendanceData);
    } catch (error) {
      console.error('Teacher portal attendance error:', error);
      res.status(500).json({ message: "Failed to fetch attendance data" });
    }
  });

  // Teacher portal stats
  app.get("/api/teacher-portal/stats/:teacherId", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const attendanceData = await storage.getAttendanceByTeacher(teacherId);
      
      const stats = attendanceData.reduce(
        (acc, record) => {
          acc.total++;
          if (record.status === 'present') acc.present++;
          else if (record.status === 'half_day') acc.halfDay++;
          else if (record.status === 'absent') acc.absent++;
          return acc;
        },
        { total: 0, present: 0, halfDay: 0, absent: 0 }
      );

      res.json(stats);
    } catch (error) {
      console.error('Teacher portal stats error:', error);
      res.status(500).json({ message: "Failed to fetch teacher stats" });
    }
  });

  // Teacher portal top performers
  app.get("/api/teacher-portal/top-performers", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topPerformers = await storage.getTopPerformingTeachers(limit);
      res.json(topPerformers);
    } catch (error) {
      console.error('Teacher portal top performers error:', error);
      res.status(500).json({ message: "Failed to fetch top performers" });
    }
  });

  // Teacher portal routes
  app.get("/api/teacher/info/:teacherId", async (req, res) => {
    try {
      const teacherId = req.params.teacherId;
      const teacher = await storage.getTeacherByTeacherId(teacherId);
      
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      
      res.json(teacher);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teacher information" });
    }
  });

  // Teacher report data endpoint
  app.get("/api/teacher-report/:teacherId", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      
      if (isNaN(teacherId)) {
        return res.status(400).json({ message: "Invalid teacher ID" });
      }
      
      console.log(`Fetching teacher report for teacherId: ${teacherId}`);
      
      // Get teacher info
      const teacher = await storage.getTeacherById(teacherId);
      if (!teacher) {
        console.log(`Teacher not found with ID: ${teacherId}`);
        return res.status(404).json({ message: "Teacher not found" });
      }

      console.log(`Found teacher: ${teacher.name}`);

      // Get attendance data
      const attendanceData = await storage.getAttendanceByTeacher(teacherId);
      console.log(`Retrieved ${attendanceData.length} attendance records`);
      
      // Get absence totals
      const absenceTotals = await storage.getTeacherAbsenceTotals(teacherId);
      console.log(`Retrieved absence totals:`, absenceTotals);

      // Calculate stats
      const stats = attendanceData.reduce(
        (acc, record) => {
          acc.total++;
          if (record.status === 'present') acc.present++;
          else if (record.status === 'half_day') acc.halfDay++;
          else if (record.status === 'absent') acc.absent++;
          return acc;
        },
        { total: 0, present: 0, halfDay: 0, absent: 0 }
      );

      console.log(`Calculated stats:`, stats);

      const response = {
        teacher,
        attendanceData,
        stats,
        absenceTotals
      };

      res.json(response);
    } catch (error) {
      console.error('Teacher report error:', error);
      res.status(500).json({ 
        message: "Failed to generate teacher report",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Database backup endpoint
  app.get("/api/backup/database", async (req, res) => {
    try {
      // Get all data using storage methods
      const usersData = await db.select().from(schema.users);
      const departmentsData = await storage.getAllDepartments();
      const teachersData = await storage.getAllTeachers();
      const attendanceData = await db.select().from(schema.attendanceRecords);
      const alertsData = await storage.getAlerts(9999);
      const holidaysData = await storage.getAllHolidays();

      // Remove passwords from user data for security
      const sanitizedUsers = usersData.map((user: any) => ({
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      }));

      const backupData = {
        timestamp: new Date().toISOString(),
        version: "1.0",
        tables: {
          users: sanitizedUsers,
          departments: departmentsData,
          teachers: teachersData,
          attendanceRecords: attendanceData,
          alerts: alertsData,
          holidays: holidaysData
        },
        metadata: {
          totalUsers: usersData.length,
          totalDepartments: departmentsData.length,
          totalTeachers: teachersData.length,
          totalAttendanceRecords: attendanceData.length,
          totalAlerts: alertsData.length,
          totalHolidays: holidaysData.length,
          backupDate: new Date().toLocaleDateString(),
          backupTime: new Date().toLocaleTimeString()
        }
      };

      const fileName = `attendance_backup_${new Date().toISOString().split('T')[0]}_${new Date().toTimeString().slice(0,8).replace(/:/g, '-')}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.json(backupData);
    } catch (error) {
      console.error('Database backup error:', error);
      res.status(500).json({ message: "Failed to create database backup" });
    }
  });

  const httpServer = createServer(app);
  
  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    wsClients.add(ws);
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({ 
      type: 'connection', 
      data: { message: 'Connected to real-time updates' },
      timestamp: Date.now() 
    }));
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      wsClients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsClients.delete(ws);
    });
  });
  
  return httpServer;
}
