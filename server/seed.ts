import { db } from "./db";
import { users, teachers, attendanceRecords, alerts } from "@shared/schema";

export async function clearDatabase() {
  console.log("Clearing all data from database...");
  
  // Delete all data in reverse order of dependencies
  await db.delete(alerts);
  await db.delete(attendanceRecords);
  await db.delete(teachers);
  
  console.log("All teachers, attendance records, and alerts cleared successfully");
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

  console.log("Database ready - no sample data added");
}