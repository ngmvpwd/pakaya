import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAttendanceSchema, insertTeacherSchema, insertDepartmentSchema } from "@shared/schema";
import { z } from "zod";
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
            args: ['--no-sandbox', '--disable-setuid-sandbox']
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

  const httpServer = createServer(app);
  return httpServer;
}
