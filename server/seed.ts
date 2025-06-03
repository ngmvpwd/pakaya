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

  console.log("Database seeded successfully with 60 teachers");
}