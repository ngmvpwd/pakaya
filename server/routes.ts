import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAttendanceSchema, insertTeacherSchema, insertDepartmentSchema } from "@shared/schema";
import { z } from "zod";

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

  // Export routes with absence totals
  app.get("/api/export/attendance", async (req, res) => {
    try {
      const { format, startDate, endDate } = req.query;
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
        
        const exportData = await storage.getAttendanceExportData(
          startDate as string,
          endDate as string
        );
        
        let csvData = 'Teacher ID,Teacher Name,Department,Total Absences,Official Leave,Private Leave,Sick Leave,Short Leave,Attendance Rate\n';
        
        exportData.forEach(data => {
          csvData += `${data.teacherId},${data.teacherName},${data.department},${data.totalAbsences},${data.officialLeave},${data.privateLeave},${data.sickLeave},${data.shortLeave},${data.attendanceRate}%\n`;
        });
        
        res.send(csvData);
      } else if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="attendance.pdf"');
        
        // Generate HTML content for PDF conversion
        let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #333; }
            .subtitle { font-size: 16px; color: #666; margin-top: 10px; }
            .section { margin-bottom: 20px; }
            .teacher-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 15px; }
            .record { border-bottom: 1px solid #eee; padding: 10px 0; }
            .record:last-child { border-bottom: none; }
            .status-present { color: #22c55e; font-weight: bold; }
            .status-absent { color: #ef4444; font-weight: bold; }
            .status-half_day { color: #f59e0b; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f8f9fa; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">ATTENDANCE REPORT</div>
            <div class="subtitle">Generated on ${new Date().toLocaleDateString()}</div>
          </div>
        `;
        
        if (req.query.teacherId) {
          const teacherId = req.query.teacherId;
          const attendance = await storage.getAttendanceByTeacher(
            parseInt(teacherId as string),
            startDate as string,
            endDate as string
          );
          const teacher = await storage.getTeacherById(parseInt(teacherId as string));
          
          htmlContent += `
          <div class="teacher-info">
            <h3>Teacher: ${teacher?.name}</h3>
            <p>Department: ${teacher?.department}</p>
            <p>Teacher ID: ${teacher?.teacherId}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Check-in Time</th>
              </tr>
            </thead>
            <tbody>
          `;
          
          attendance.forEach(record => {
            htmlContent += `
            <tr>
              <td>${record.date}</td>
              <td class="status-${record.status}">${record.status.replace('_', ' ').toUpperCase()}</td>
              <td>${record.checkInTime || 'N/A'}</td>
            </tr>
            `;
          });
          
          htmlContent += '</tbody></table>';
        } else {
          const today = new Date().toISOString().split('T')[0];
          const targetDate = (endDate as string) || today;
          const attendance = await storage.getAttendanceByDate(targetDate);
          
          htmlContent += `
          <div class="section">
            <h3>Daily Attendance Report - ${targetDate}</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Teacher Name</th>
                <th>Department</th>
                <th>Teacher ID</th>
                <th>Status</th>
                <th>Check-in Time</th>
              </tr>
            </thead>
            <tbody>
          `;
          
          attendance.forEach(record => {
            htmlContent += `
            <tr>
              <td>${record.teacher.name}</td>
              <td>${record.teacher.department}</td>
              <td>${record.teacher.teacherId}</td>
              <td class="status-${record.status}">${record.status.replace('_', ' ').toUpperCase()}</td>
              <td>${record.checkInTime || 'N/A'}</td>
            </tr>
            `;
          });
          
          htmlContent += '</tbody></table>';
        }
        
        htmlContent += `
          <div style="margin-top: 30px; font-size: 12px; color: #666;">
            <p>Report generated automatically by School Attendance Management System</p>
          </div>
        </body>
        </html>
        `;
        
        // For now, return HTML that browsers can print as PDF
        // In production, you'd use a library like puppeteer or jsPDF
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
      } else {
        res.status(400).json({ message: "Unsupported export format. Use 'csv' or 'pdf'" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
