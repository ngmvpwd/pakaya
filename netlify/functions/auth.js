const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { eq } = require('drizzle-orm');

// Import schema
const schema = require('../../shared/schema-compiled.js');

// Database setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

exports.handler = async (event, context) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    // Initialize database if needed
    await initializeDatabase();

    if (event.httpMethod === 'POST') {
      const { username, password } = JSON.parse(event.body);
      
      if (!username || !password) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ message: 'Username and password required' })
        };
      }

      const user = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
      
      if (user.length === 0 || user[0].password !== password) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ message: 'Invalid credentials' })
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          user: {
            id: user[0].id,
            username: user[0].username,
            role: user[0].role,
            name: user[0].name
          }
        })
      };
    }
  } catch (error) {
    console.error('Auth error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};

let isInitialized = false;

async function initializeDatabase() {
  if (isInitialized) return;
  
  try {
    const adminUser = await db.select().from(schema.users).where(eq(schema.users.username, 'admin')).limit(1);
    
    if (adminUser.length === 0) {
      await db.insert(schema.users).values({
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        name: 'System Administrator'
      });
      
      await db.insert(schema.departments).values([
        { name: 'Mathematics', description: 'Mathematics Department' },
        { name: 'Science', description: 'Science Department' },
        { name: 'English', description: 'English Department' },
        { name: 'History', description: 'History Department' },
        { name: 'Computer Science', description: 'Computer Science Department' }
      ]);
    }
    
    isInitialized = true;
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}