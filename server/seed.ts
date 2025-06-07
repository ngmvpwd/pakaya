import { db } from "./db";
import { users, departments, teachers, attendanceRecords, alerts } from "@shared/schema";

export async function clearDatabase() {
  console.log("Clearing all data from database...");
  
  // Delete all data in reverse order of dependencies
  await db.delete(alerts);
  await db.delete(attendanceRecords);
  await db.delete(teachers);
  await db.delete(departments);
  
  console.log("All data cleared successfully");
}

export async function seedDatabase() {
  // Check if users already exist
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length === 0) {
    // Insert default users only if they don't exist
    await db.insert(users).values([
      { username: 'admin', password: 'admin123', role: 'admin', name: 'Admin User' },
      { username: 'dataentry', password: 'data123', role: 'dataentry', name: 'Data Entry User' }
    ]);
    console.log("Default users created");
  }

  // Check if departments already exist
  const existingDepartments = await db.select().from(departments).limit(1);
  if (existingDepartments.length === 0) {
    // Insert default departments
    await db.insert(departments).values([
      { name: 'Mathematics', description: 'Mathematics Department' },
      { name: 'Science', description: 'Science Department' },
      { name: 'English', description: 'English Department' },
      { name: 'Social Studies', description: 'Social Studies Department' },
      { name: 'Physical Education', description: 'Physical Education Department' },
      { name: 'Art', description: 'Art Department' },
      { name: 'Music', description: 'Music Department' },
      { name: 'Computer Science', description: 'Computer Science Department' }
    ]);
    console.log("Default departments created");
  }

  // Check if teachers already exist
  const existingTeachers = await db.select().from(teachers).limit(1);
  if (existingTeachers.length === 0) {
    // Insert sample teachers across different departments
    await db.insert(teachers).values([
      { teacherId: 'T001', name: 'Sarah Johnson', department: 'Mathematics', email: 'sarah.johnson@school.edu', phone: '555-0101', joinDate: '2020-08-15' },
      { teacherId: 'T002', name: 'Michael Chen', department: 'Science', email: 'michael.chen@school.edu', phone: '555-0102', joinDate: '2019-09-01' },
      { teacherId: 'T003', name: 'Emily Rodriguez', department: 'English', email: 'emily.rodriguez@school.edu', phone: '555-0103', joinDate: '2021-01-10' },
      { teacherId: 'T004', name: 'David Kim', department: 'Mathematics', email: 'david.kim@school.edu', phone: '555-0104', joinDate: '2018-07-20' },
      { teacherId: 'T005', name: 'Lisa Thompson', department: 'Science', email: 'lisa.thompson@school.edu', phone: '555-0105', joinDate: '2020-03-05' },
      { teacherId: 'T006', name: 'Robert Wilson', department: 'Social Studies', email: 'robert.wilson@school.edu', phone: '555-0106', joinDate: '2017-08-30' },
      { teacherId: 'T007', name: 'Maria Garcia', department: 'English', email: 'maria.garcia@school.edu', phone: '555-0107', joinDate: '2019-11-15' },
      { teacherId: 'T008', name: 'James Davis', department: 'Physical Education', email: 'james.davis@school.edu', phone: '555-0108', joinDate: '2020-06-01' },
      { teacherId: 'T009', name: 'Jennifer Lee', department: 'Art', email: 'jennifer.lee@school.edu', phone: '555-0109', joinDate: '2021-02-20' },
      { teacherId: 'T010', name: 'Christopher Brown', department: 'Music', email: 'christopher.brown@school.edu', phone: '555-0110', joinDate: '2018-09-10' },
      { teacherId: 'T011', name: 'Amanda Taylor', department: 'Computer Science', email: 'amanda.taylor@school.edu', phone: '555-0111', joinDate: '2020-01-15' },
      { teacherId: 'T012', name: 'Daniel Martinez', department: 'Mathematics', email: 'daniel.martinez@school.edu', phone: '555-0112', joinDate: '2019-04-25' },
      { teacherId: 'T013', name: 'Jessica White', department: 'Science', email: 'jessica.white@school.edu', phone: '555-0113', joinDate: '2021-08-01' },
      { teacherId: 'T014', name: 'Kevin Anderson', department: 'Social Studies', email: 'kevin.anderson@school.edu', phone: '555-0114', joinDate: '2018-01-30' },
      { teacherId: 'T015', name: 'Nicole Miller', department: 'English', email: 'nicole.miller@school.edu', phone: '555-0115', joinDate: '2020-09-12' },
      { teacherId: 'T016', name: 'Ryan Jackson', department: 'Physical Education', email: 'ryan.jackson@school.edu', phone: '555-0116', joinDate: '2019-05-18' },
      { teacherId: 'T017', name: 'Stephanie Moore', department: 'Art', email: 'stephanie.moore@school.edu', phone: '555-0117', joinDate: '2021-03-08' },
      { teacherId: 'T018', name: 'Brandon Harris', department: 'Music', email: 'brandon.harris@school.edu', phone: '555-0118', joinDate: '2017-11-22' },
      { teacherId: 'T019', name: 'Laura Clark', department: 'Computer Science', email: 'laura.clark@school.edu', phone: '555-0119', joinDate: '2020-04-14' },
      { teacherId: 'T020', name: 'Andrew Lewis', department: 'Mathematics', email: 'andrew.lewis@school.edu', phone: '555-0120', joinDate: '2018-12-03' }
    ]);
    console.log("Sample teachers created");
  }

  // Add historical attendance data for the past 3 months
  const existingAttendance = await db.select().from(attendanceRecords).limit(1);
  if (existingAttendance.length === 0) {
    console.log("Generating 3 months of historical attendance data...");
    
    const teachersList = await db.select().from(teachers);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    
    const attendanceDataToInsert = [];
    
    // Generate attendance for each day over the past 3 months including today
    const today = new Date();
    const endDate = new Date(today.getTime()); // Create a copy to avoid mutation
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      
      const dateStr = d.toISOString().split('T')[0];
      console.log(`Generating attendance for: ${dateStr}`);
      
      for (const teacher of teachersList) {
        // Generate realistic attendance patterns
        const random = Math.random();
        let status: 'present' | 'absent' | 'half_day' | 'short_leave';
        let absentCategory: 'official_leave' | 'private_leave' | 'sick_leave' | null = null;
        let checkInTime: string | null = null;
        let checkOutTime: string | null = null;
        
        if (random < 0.85) {
          // 85% present
          status = 'present';
          // Random check-in time between 7:30 and 9:00 AM
          const checkInHour = 7 + Math.floor(Math.random() * 2);
          const checkInMinute = Math.floor(Math.random() * 60);
          checkInTime = `${checkInHour.toString().padStart(2, '0')}:${checkInMinute.toString().padStart(2, '0')}`;
        } else if (random < 0.92) {
          // 7% absent
          status = 'absent';
          const absentRandom = Math.random();
          if (absentRandom < 0.4) {
            absentCategory = 'official_leave';
          } else if (absentRandom < 0.7) {
            absentCategory = 'sick_leave';
          } else {
            absentCategory = 'private_leave';
          }
        } else if (random < 0.97) {
          // 5% half day
          status = 'half_day';
          checkInTime = `${(11 + Math.floor(Math.random() * 2)).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
        } else {
          // 3% short leave
          status = 'short_leave';
          checkInTime = `${(7 + Math.floor(Math.random() * 2)).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
          checkOutTime = `${(14 + Math.floor(Math.random() * 3)).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
        }
        
        attendanceDataToInsert.push({
          teacherId: teacher.id,
          date: dateStr,
          status,
          absentCategory,
          checkInTime,
          checkOutTime,
          notes: null,
          recordedBy: 1, // admin user
        });
      }
    }
    
    // Add today's attendance data manually to ensure it's included
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDay = new Date().getDay();
    
    // Only add today's data if it's a weekday (not weekend)
    if (todayDay !== 0 && todayDay !== 6) {
      for (const teacher of teachersList) {
        const random = Math.random();
        let status: 'present' | 'absent' | 'half_day' | 'short_leave';
        let absentCategory: 'official_leave' | 'private_leave' | 'sick_leave' | null = null;
        let checkInTime: string | null = null;
        let checkOutTime: string | null = null;
        
        if (random < 0.85) {
          status = 'present';
          const checkInHour = 7 + Math.floor(Math.random() * 2);
          const checkInMinute = Math.floor(Math.random() * 60);
          checkInTime = `${checkInHour.toString().padStart(2, '0')}:${checkInMinute.toString().padStart(2, '0')}`;
        } else if (random < 0.92) {
          status = 'absent';
          const absentRandom = Math.random();
          if (absentRandom < 0.4) {
            absentCategory = 'official_leave';
          } else if (absentRandom < 0.7) {
            absentCategory = 'sick_leave';
          } else {
            absentCategory = 'private_leave';
          }
        } else if (random < 0.97) {
          status = 'half_day';
          checkInTime = `${(11 + Math.floor(Math.random() * 2)).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
        } else {
          status = 'short_leave';
          checkInTime = `${(7 + Math.floor(Math.random() * 2)).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
          checkOutTime = `${(14 + Math.floor(Math.random() * 3)).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
        }
        
        attendanceDataToInsert.push({
          teacherId: teacher.id,
          date: todayStr,
          status,
          absentCategory,
          checkInTime,
          checkOutTime,
          notes: null,
          recordedBy: 1,
        });
      }
      console.log(`Added today's attendance data for ${todayStr}`);
    }

    // Insert in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < attendanceDataToInsert.length; i += batchSize) {
      const batch = attendanceDataToInsert.slice(i, i + batchSize);
      await db.insert(attendanceRecords).values(batch);
    }
    
    console.log(`Generated ${attendanceDataToInsert.length} attendance records over 3 months`);
  }

  console.log("Database ready with default data");
}