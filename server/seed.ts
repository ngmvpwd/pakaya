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
    // Insert 60 sample teachers
    const departmentList = ['Mathematics', 'Science', 'English', 'Social Studies', 'Physical Education', 'Art', 'Music', 'Computer Science'];
    
    const teacherNames = [
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
      const name = teacherNames[i - 1] || `Teacher ${i}`;
      const department = departmentList[i % departmentList.length];
      
      teachersData.push({
        teacherId,
        name,
        department,
        email: `${name.toLowerCase().replace(' ', '.')}@school.edu`,
        phone: `+1-555-${String(i).padStart(4, '0')}`,
        joinDate: '2023-09-01'
      });
    }
    
    await db.insert(teachers).values(teachersData);
    console.log("60 sample teachers created");
  }

  console.log("Database ready with default data");
}