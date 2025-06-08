const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { eq, desc, and, gte, lte, sql, count, sum, avg, isNotNull } = require('drizzle-orm');
const bcrypt = require('bcryptjs');
const { format, subDays, startOfWeek, endOfWeek, parseISO } = require('date-fns');

// Import schema
const schema = require('../../shared/schema-compiled.js');

// Database setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

// Helper function to handle CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

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
    const path = event.path.replace('/.netlify/functions/api', '');
    const method = event.httpMethod;
    
    // Parse request body if present
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        // Handle non-JSON body
      }
    }

    // Route handling
    let response;
    
    // Auth routes
    if (path === '/auth/login' && method === 'POST') {
      response = await handleLogin(body);
    }
    
    // Teacher routes
    else if (path === '/teachers' && method === 'GET') {
      response = await handleGetTeachers();
    } else if (path === '/teachers' && method === 'POST') {
      response = await handleCreateTeacher(body);
    } else if (path.startsWith('/teachers/') && method === 'PUT') {
      const id = parseInt(path.split('/')[2]);
      response = await handleUpdateTeacher(id, body);
    } else if (path.startsWith('/teachers/') && method === 'DELETE') {
      const id = parseInt(path.split('/')[2]);
      response = await handleDeleteTeacher(id);
    }
    
    // Department routes
    else if (path === '/departments' && method === 'GET') {
      response = await handleGetDepartments();
    } else if (path === '/departments' && method === 'POST') {
      response = await handleCreateDepartment(body);
    } else if (path.startsWith('/departments/') && method === 'PUT') {
      const id = parseInt(path.split('/')[2]);
      response = await handleUpdateDepartment(id, body);
    } else if (path.startsWith('/departments/') && method === 'DELETE') {
      const id = parseInt(path.split('/')[2]);
      response = await handleDeleteDepartment(id);
    }
    
    // Stats routes
    else if (path === '/stats/overview' && method === 'GET') {
      response = await handleStatsOverview();
    } else if (path === '/stats/trends' && method === 'GET') {
      const days = event.queryStringParameters?.days || '30';
      const startDate = event.queryStringParameters?.startDate;
      const endDate = event.queryStringParameters?.endDate;
      response = await handleStatsTrends(days, startDate, endDate);
    } else if (path === '/stats/departments' && method === 'GET') {
      response = await handleDepartmentStats();
    } else if (path === '/stats/top-performers' && method === 'GET') {
      const limit = event.queryStringParameters?.limit || '10';
      response = await handleTopPerformers(parseInt(limit));
    }
    
    // Attendance routes
    else if (path === '/attendance/date' && method === 'GET') {
      const date = event.queryStringParameters?.date || new Date().toISOString().split('T')[0];
      response = await handleGetAttendanceByDate(date);
    } else if (path === '/attendance' && method === 'POST') {
      response = await handleCreateAttendance(body);
    } else if (path === '/attendance/bulk' && method === 'POST') {
      response = await handleBulkAttendance(body);
    } else if (path.startsWith('/attendance/') && method === 'PUT') {
      const id = parseInt(path.split('/')[2]);
      response = await handleUpdateAttendance(id, body);
    } else if (path.startsWith('/attendance/teacher/') && method === 'GET') {
      const teacherId = parseInt(path.split('/')[3]);
      const startDate = event.queryStringParameters?.startDate;
      const endDate = event.queryStringParameters?.endDate;
      response = await handleGetTeacherAttendance(teacherId, startDate, endDate);
    }
    
    // Analytics routes
    else if (path === '/analytics/absent' && method === 'GET') {
      const startDate = event.queryStringParameters?.startDate;
      const endDate = event.queryStringParameters?.endDate;
      response = await handleAbsentAnalytics(startDate, endDate);
    } else if (path.startsWith('/analytics/teacher/') && path.endsWith('/pattern') && method === 'GET') {
      const teacherId = parseInt(path.split('/')[3]);
      const weeks = event.queryStringParameters?.weeks || '12';
      response = await handleTeacherPattern(teacherId, parseInt(weeks));
    }
    
    // Alert routes
    else if (path === '/alerts' && method === 'GET') {
      response = await handleGetAlerts();
    } else if (path.startsWith('/alerts/') && method === 'POST') {
      const id = parseInt(path.split('/')[2]);
      response = await handleMarkAlertRead(id);
    }
    
    // Holiday routes
    else if (path === '/holidays' && method === 'GET') {
      response = await handleGetHolidays();
    } else if (path === '/holidays' && method === 'POST') {
      response = await handleCreateHoliday(body);
    } else if (path.startsWith('/holidays/') && path.endsWith('/check') && method === 'GET') {
      const date = path.split('/')[2];
      response = await handleCheckHoliday(date);
    } else if (path.startsWith('/holidays/') && method === 'PUT') {
      const id = parseInt(path.split('/')[2]);
      response = await handleUpdateHoliday(id, body);
    } else if (path.startsWith('/holidays/') && method === 'DELETE') {
      const id = parseInt(path.split('/')[2]);
      response = await handleDeleteHoliday(id);
    }
    
    // Teacher Portal routes
    else if (path === '/teacher-portal/login' && method === 'POST') {
      response = await handleTeacherLogin(body);
    } else if (path.startsWith('/teacher-portal/attendance/') && method === 'GET') {
      const teacherId = parseInt(path.split('/')[3]);
      response = await handleTeacherPortalAttendance(teacherId);
    }
    
    // Export routes
    else if (path === '/export/attendance' && method === 'POST') {
      response = await handleExportAttendance(body);
    }
    
    // Backup routes
    else if (path === '/backup/stats' && method === 'GET') {
      response = await handleBackupStats();
    }
    
    else {
      response = { statusCode: 404, body: { message: 'Not found' } };
    }

    return {
      statusCode: response.statusCode || 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response.body || response)
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};

// Route handlers
async function handleLogin(body) {
  const { username, password } = body;
  
  if (!username || !password) {
    return { statusCode: 400, body: { message: 'Username and password required' } };
  }

  const user = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
  
  if (user.length === 0 || user[0].password !== password) {
    return { statusCode: 401, body: { message: 'Invalid credentials' } };
  }

  return {
    statusCode: 200,
    body: {
      user: {
        id: user[0].id,
        username: user[0].username,
        role: user[0].role,
        name: user[0].name
      }
    }
  };
}

async function handleGetTeachers() {
  const teachers = await db.select().from(schema.teachers).orderBy(schema.teachers.name);
  return { statusCode: 200, body: teachers };
}

async function handleCreateTeacher(body) {
  const teacher = await db.insert(schema.teachers).values(body).returning();
  return { statusCode: 201, body: teacher[0] };
}

async function handleUpdateTeacher(id, body) {
  const teacher = await db.update(schema.teachers).set(body).where(eq(schema.teachers.id, id)).returning();
  if (teacher.length === 0) {
    return { statusCode: 404, body: { message: 'Teacher not found' } };
  }
  return { statusCode: 200, body: teacher[0] };
}

async function handleDeleteTeacher(id) {
  await db.delete(schema.teachers).where(eq(schema.teachers.id, id));
  return { statusCode: 204, body: null };
}

async function handleGetDepartments() {
  const departments = await db.select().from(schema.departments).orderBy(schema.departments.name);
  return { statusCode: 200, body: departments };
}

async function handleCreateDepartment(body) {
  const department = await db.insert(schema.departments).values(body).returning();
  return { statusCode: 201, body: department[0] };
}

async function handleStatsOverview() {
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

async function handleStatsTrends(days, startDate, endDate) {
  let dateCondition;
  
  if (startDate && endDate) {
    dateCondition = and(
      gte(schema.attendanceRecords.date, startDate),
      lte(schema.attendanceRecords.date, endDate)
    );
  } else {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    const startDateStr = daysAgo.toISOString().split('T')[0];
    dateCondition = gte(schema.attendanceRecords.date, startDateStr);
  }

  const trends = await db.select({
    date: schema.attendanceRecords.date,
    status: schema.attendanceRecords.status,
    count: count()
  })
  .from(schema.attendanceRecords)
  .where(dateCondition)
  .groupBy(schema.attendanceRecords.date, schema.attendanceRecords.status)
  .orderBy(schema.attendanceRecords.date);

  // Process trends data
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

async function handleGetAttendanceByDate(date) {
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

async function handleCreateAttendance(body) {
  const attendance = await db.insert(schema.attendanceRecords).values(body).returning();
  return { statusCode: 201, body: attendance[0] };
}

async function handleUpdateAttendance(id, body) {
  const attendance = await db.update(schema.attendanceRecords).set(body).where(eq(schema.attendanceRecords.id, id)).returning();
  if (attendance.length === 0) {
    return { statusCode: 404, body: { message: 'Attendance record not found' } };
  }
  return { statusCode: 200, body: attendance[0] };
}

async function handleGetAlerts() {
  const alerts = await db.select({
    id: schema.alerts.id,
    type: schema.alerts.type,
    message: schema.alerts.message,
    severity: schema.alerts.severity,
    isRead: schema.alerts.isRead,
    createdAt: schema.alerts.createdAt,
    teacher: {
      id: schema.teachers.id,
      name: schema.teachers.name,
      teacherId: schema.teachers.teacherId
    }
  })
  .from(schema.alerts)
  .innerJoin(schema.teachers, eq(schema.alerts.teacherId, schema.teachers.id))
  .where(eq(schema.alerts.isRead, false))
  .orderBy(desc(schema.alerts.createdAt))
  .limit(10);

  return { statusCode: 200, body: alerts };
}

async function handleMarkAlertRead(id) {
  await db.update(schema.alerts).set({ isRead: true }).where(eq(schema.alerts.id, id));
  return { statusCode: 200, body: { success: true } };
}

async function handleGetHolidays() {
  const holidays = await db.select().from(schema.holidays).orderBy(schema.holidays.date);
  return { statusCode: 200, body: holidays };
}

async function handleCreateHoliday(body) {
  const holiday = await db.insert(schema.holidays).values(body).returning();
  return { statusCode: 201, body: holiday[0] };
}

async function handleCheckHoliday(date) {
  const holiday = await db.select().from(schema.holidays).where(eq(schema.holidays.date, date)).limit(1);
  return { statusCode: 200, body: { isHoliday: holiday.length > 0 } };
}