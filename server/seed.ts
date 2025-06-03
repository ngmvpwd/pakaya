import { db } from "./db";
import { users, teachers, attendanceRecords, alerts } from "@shared/schema";

export async function seedDatabase() {
  // Check if data already exists
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    console.log("Database already seeded");
    return;
  }

  // Insert default users
  await db.insert(users).values([
    { username: 'admin', password: 'admin123', role: 'admin', name: 'Admin User' },
    { username: 'dataentry', password: 'data123', role: 'dataentry', name: 'Data Entry User' }
  ]);

  // Insert sample teachers
  const departments = ['Mathematics', 'Science', 'English', 'Social Studies', 'Physical Education', 'Art', 'Music'];
  const names = [
    'Robert Johnson', 'Maria Garcia', 'David Lee', 'Sarah Wilson', 'Michael Brown',
    'Jennifer Davis', 'Christopher Miller', 'Amanda Martinez', 'Matthew Anderson',
    'Jessica Taylor', 'Daniel Thomas', 'Ashley Jackson', 'James White', 'Emily Harris',
    'John Martin', 'Lisa Thompson', 'William Garcia', 'Karen Rodriguez', 'Richard Lewis',
    'Nancy Walker', 'Joseph Hall', 'Betty Allen', 'Thomas Young', 'Helen King',
    'Charles Wright', 'Sandra Scott', 'Steven Green', 'Donna Adams', 'Paul Baker',
    'Carol Nelson', 'Mark Carter', 'Michelle Mitchell', 'Donald Perez', 'Linda Roberts',
    'George Turner', 'Susan Phillips', 'Kenneth Campbell', 'Barbara Parker', 'Edward Evans',
    'Mary Edwards', 'Ronald Collins', 'Patricia Stewart', 'Jason Sanchez', 'Deborah Morris',
    'Anthony Rogers', 'Karen Reed', 'Joshua Cook', 'Lisa Bailey', 'Andrew Cooper',
    'Elizabeth Richardson', 'Brian Cox', 'Sharon Howard', 'Kevin Ward', 'Cynthia Torres',
    'Eric Peterson', 'Kathleen Gray', 'Jacob Ramirez', 'Amy James', 'Ryan Watson',
    'Angela Brooks', 'Alexander Kelly', 'Brenda Sanders', 'Noah Price', 'Emma Bennett'
  ];

  const teachersData = [];
  for (let i = 1; i <= 60; i++) {
    const teacherId = `T${String(i).padStart(3, '0')}`;
    const name = names[i - 1] || `Teacher ${i}`;
    const department = departments[Math.floor(Math.random() * departments.length)];
    
    teachersData.push({
      teacherId,
      name,
      department,
      email: `${name.toLowerCase().replace(' ', '.')}@school.edu`,
      phone: `555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      joinDate: '2020-09-01'
    });
  }
  
  await db.insert(teachers).values(teachersData);

  // Get inserted teachers to get their IDs
  const insertedTeachers = await db.select().from(teachers);

  // Insert sample attendance records for the last 30 days
  const attendanceData = [];
  const today = new Date();
  
  for (let day = 0; day < 30; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() - day);
    const dateStr = date.toISOString().split('T')[0];
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    for (const teacher of insertedTeachers) {
      const random = Math.random();
      let status = 'present';
      let checkInTime = '09:00';
      
      if (random < 0.05) {
        status = 'absent';
        checkInTime = null;
      } else if (random < 0.10) {
        status = 'half_day';
        checkInTime = '13:00';
      } else {
        // Random check-in time between 8:30 and 9:30
        const minutes = Math.floor(Math.random() * 60) + 30; // 30-90 minutes after 8:00
        const hours = Math.floor(minutes / 60) + 8;
        const mins = minutes % 60;
        checkInTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      }
      
      attendanceData.push({
        teacherId: teacher.id,
        date: dateStr,
        status,
        checkInTime,
        recordedBy: 1
      });
    }
  }

  await db.insert(attendanceRecords).values(attendanceData);

  // Insert sample alerts
  const alertsData = [
    { teacherId: 5, type: 'absence', message: 'High absence rate this week (15%)', severity: 'medium' },
    { teacherId: 12, type: 'extended', message: 'Absent for 3 consecutive days', severity: 'high' },
    { teacherId: 23, type: 'pattern', message: 'Frequent late arrivals this month', severity: 'low' },
    { teacherId: 34, type: 'absence', message: 'Below 80% attendance this month', severity: 'medium' }
  ];

  await db.insert(alerts).values(alertsData);

  console.log("Database seeded successfully with 60 teachers and sample data");
}