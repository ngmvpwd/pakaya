const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { eq, desc, and, gte, lte, sql, count } = require('drizzle-orm');

// Import schema
const schema = require('../../shared/schema-compiled.js');

// Database setup with connection pooling
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1 // Limit connections for serverless
});
const db = drizzle({ client: pool, schema });

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// Database initialization flag
let isInitialized = false;

// Main handler
exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    // Initialize database on first run
    if (!isInitialized) {
      await initializeDatabase();
    }

    // Parse request
    const method = event.httpMethod;
    let body = {};
    
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        // Non-JSON body
      }
    }

    // Extract API path - handle Netlify's routing
    let apiPath = '';
    
    // Method 1: From query parameter (our redirect setup)
    if (event.queryStringParameters && event.queryStringParameters.path) {
      apiPath = event.queryStringParameters.path;
    }
    // Method 2: From path
    else if (event.path && event.path.includes('/api/')) {
      apiPath = event.path.split('/api/')[1] || '';
    }
    // Method 3: From raw URL
    else if (event.rawUrl && event.rawUrl.includes('/api/')) {
      apiPath = event.rawUrl.split('/api/')[1] || '';
    }

    // Handle authentication
    if (apiPath === 'login' && method === 'POST') {
      return await handleLogin(body);
    }
    if (apiPath === 'auth/login' && method === 'POST') {
      return await handleLogin(body);
    }

    // Handle other routes
    const response = await routeRequest(apiPath, method, body, event.queryStringParameters);
    
    return {
      statusCode: response.statusCode || 200,
      headers: corsHeaders,
      body: JSON.stringify(response.body || response)
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error.message
      })
    };
  }
};

async function handleLogin(body) {
  const { username, password } = body;
  
  if (!username || !password) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Username and password required' })
    };
  }

  try {
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
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Database error' })
    };
  }
}

async function routeRequest(path, method, body, queryParams) {
  // Teachers
  if (path === 'teachers' && method === 'GET') {
    const teachers = await db.select().from(schema.teachers).orderBy(schema.teachers.name);
    return { statusCode: 200, body: teachers };
  }
  
  if (path === 'teachers' && method === 'POST') {
    const teacher = await db.insert(schema.teachers).values(body).returning();
    return { statusCode: 201, body: teacher[0] };
  }

  // Departments
  if (path === 'departments' && method === 'GET') {
    const departments = await db.select().from(schema.departments).orderBy(schema.departments.name);
    return { statusCode: 200, body: departments };
  }

  if (path === 'departments' && method === 'POST') {
    const department = await db.insert(schema.departments).values(body).returning();
    return { statusCode: 201, body: department[0] };
  }

  // Stats overview
  if (path === 'stats/overview' && method === 'GET') {
    const today = new Date().toISOString().split('T')[0];
    
    const totalTeachers = await db.select({ count: count() }).from(schema.teachers);
    
    const todayAttendance = await db.select({
      status: schema.attendanceRecords.status,
      count: count()
    })
    .from(schema.attendanceRecords)
    .where(eq(schema.attendanceRecords.date, today))
    .groupBy(schema.attendanceRecords.status);

    let presentToday = 0;
    let absentToday = 0;
    let halfDayToday = 0;
    let shortLeaveToday = 0;

    todayAttendance.forEach(item => {
      switch (item.status) {
        case 'present': presentToday = item.count; break;
        case 'absent': absentToday = item.count; break;
        case 'half_day': halfDayToday = item.count; break;
        case 'short_leave': shortLeaveToday = item.count; break;
      }
    });

    const totalMarked = presentToday + absentToday + halfDayToday + shortLeaveToday;
    const effectivePresent = presentToday + (halfDayToday * 0.5) + (shortLeaveToday * 0.75);
    const attendanceRate = totalMarked > 0 ? (effectivePresent / totalMarked) * 100 : 0;

    return {
      statusCode: 200,
      body: {
        totalTeachers: totalTeachers[0].count,
        presentToday,
        absentToday,
        halfDayToday,
        shortLeaveToday,
        attendanceRate: Math.round(attendanceRate * 100) / 100
      }
    };
  }

  // Stats trends
  if (path === 'stats/trends' && method === 'GET') {
    const days = queryParams?.days || '30';
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    const startDateStr = daysAgo.toISOString().split('T')[0];

    const trends = await db.select({
      date: schema.attendanceRecords.date,
      status: schema.attendanceRecords.status,
      count: count()
    })
    .from(schema.attendanceRecords)
    .where(gte(schema.attendanceRecords.date, startDateStr))
    .groupBy(schema.attendanceRecords.date, schema.attendanceRecords.status)
    .orderBy(schema.attendanceRecords.date);

    const trendMap = {};
    trends.forEach(trend => {
      if (!trendMap[trend.date]) {
        trendMap[trend.date] = { date: trend.date, present: 0, absent: 0, halfDay: 0, shortLeave: 0 };
      }
      
      switch (trend.status) {
        case 'present': trendMap[trend.date].present = trend.count; break;
        case 'absent': trendMap[trend.date].absent = trend.count; break;
        case 'half_day': trendMap[trend.date].halfDay = trend.count; break;
        case 'short_leave': trendMap[trend.date].shortLeave = trend.count; break;
      }
    });

    return { statusCode: 200, body: Object.values(trendMap) };
  }

  // Alerts
  if (path === 'alerts' && method === 'GET') {
    const alerts = await db.select({
      id: schema.alerts.id,
      type: schema.alerts.type,
      message: schema.alerts.message,
      severity: schema.alerts.severity,
      isRead: schema.alerts.isRead,
      createdAt: schema.alerts.createdAt
    })
    .from(schema.alerts)
    .where(eq(schema.alerts.isRead, false))
    .orderBy(desc(schema.alerts.createdAt))
    .limit(10);

    return { statusCode: 200, body: alerts };
  }

  // Attendance by date
  if (path === 'attendance/date' && method === 'GET') {
    const date = queryParams?.date || new Date().toISOString().split('T')[0];
    
    const attendance = await db.select({
      id: schema.attendanceRecords.id,
      teacherId: schema.attendanceRecords.teacherId,
      date: schema.attendanceRecords.date,
      status: schema.attendanceRecords.status,
      checkInTime: schema.attendanceRecords.checkInTime,
      checkOutTime: schema.attendanceRecords.checkOutTime,
      notes: schema.attendanceRecords.notes,
      absentCategory: schema.attendanceRecords.absentCategory,
      teacher: {
        id: schema.teachers.id,
        teacherId: schema.teachers.teacherId,
        name: schema.teachers.name,
        department: schema.teachers.department
      }
    })
    .from(schema.attendanceRecords)
    .innerJoin(schema.teachers, eq(schema.attendanceRecords.teacherId, schema.teachers.id))
    .where(eq(schema.attendanceRecords.date, date))
    .orderBy(schema.teachers.name);

    return { statusCode: 200, body: attendance };
  }

  // Holidays
  if (path === 'holidays' && method === 'GET') {
    const holidays = await db.select().from(schema.holidays).orderBy(schema.holidays.date);
    return { statusCode: 200, body: holidays };
  }

  // Default 404
  return { statusCode: 404, body: { message: 'Not found', path, method } };
}

async function initializeDatabase() {
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