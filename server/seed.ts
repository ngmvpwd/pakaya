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
    // Insert default admin user only
    await db.insert(users).values([
      { username: 'admin', password: 'admin123', role: 'admin', name: 'System Administrator' }
    ]);
    console.log("Default admin user created");
  }

  // Check if departments already exist
  const existingDepartments = await db.select().from(departments).limit(1);
  if (existingDepartments.length === 0) {
    // Insert basic department structure
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
    console.log("Basic departments created");
  }

  console.log("Database ready for production use");
}