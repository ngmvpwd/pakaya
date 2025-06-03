import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAttendanceSchema, insertTeacherSchema } from "@shared/schema";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const bulkAttendanceSchema = z.object({
  date: z.string(),
  records: z.array(z.object({
    teacherId: z.number(),
    status: z.enum(['present', 'absent', 'half_day']),
    checkInTime: z.string().optional(),
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
      const record = await storage.createAttendanceRecord(attendanceData);
      res.json(record);
    } catch (error) {
      res.status(400).json({ message: "Invalid attendance data" });
    }
  });

  app.post("/api/attendance/bulk", async (req, res) => {
    try {
      const { date, records, recordedBy } = bulkAttendanceSchema.parse(req.body);
      
      const results = [];
      for (const record of records) {
        const attendanceRecord = await storage.createAttendanceRecord({
          teacherId: record.teacherId,
          date,
          status: record.status,
          checkInTime: record.checkInTime || null,
          notes: record.notes || null,
          recordedBy,
        });
        results.push(attendanceRecord);
      }
      
      res.json(results);
    } catch (error) {
      res.status(400).json({ message: "Invalid bulk attendance data" });
    }
  });

  app.put("/api/attendance/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertAttendanceSchema.partial().parse(req.body);
      
      const record = await storage.updateAttendanceRecord(id, updateData);
      if (!record) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      
      res.json(record);
    } catch (error) {
      res.status(400).json({ message: "Invalid update data" });
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
      const days = parseInt(req.query.days as string) || 7;
      const trends = await storage.getAttendanceTrends(days);
      res.json(trends);
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

  // Export routes
  app.get("/api/export/attendance", async (req, res) => {
    try {
      const { format, startDate, endDate, teacherId } = req.query;
      
      // This is a simplified version - in production you'd use proper CSV/PDF libraries
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"');
        
        let csvData = 'Teacher Name,Date,Status,Check In Time\n';
        
        if (teacherId) {
          const attendance = await storage.getAttendanceByTeacher(
            parseInt(teacherId as string),
            startDate as string,
            endDate as string
          );
          const teacher = await storage.getTeacherById(parseInt(teacherId as string));
          
          attendance.forEach(record => {
            csvData += `${teacher?.name},${record.date},${record.status},${record.checkInTime || 'N/A'}\n`;
          });
        } else {
          // Export all attendance for date range
          const today = new Date().toISOString().split('T')[0];
          const targetDate = (endDate as string) || today;
          const attendance = await storage.getAttendanceByDate(targetDate);
          
          attendance.forEach(record => {
            csvData += `${record.teacher.name},${record.date},${record.status},${record.checkInTime || 'N/A'}\n`;
          });
        }
        
        res.send(csvData);
      } else {
        res.status(400).json({ message: "Unsupported export format" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
