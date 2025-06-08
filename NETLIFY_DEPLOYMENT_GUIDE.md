# Complete Netlify Deployment Guide

This guide will walk you through deploying the School Attendance Management System on Netlify.

## Prerequisites

1. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **GitHub Account**: Your code should be in a GitHub repository
3. **Database**: You'll need a PostgreSQL database (Neon DB recommended)

## Step 1: Prepare Your Database

### Option A: Using Neon DB (Recommended)
1. Go to [neon.tech](https://neon.tech) and create an account
2. Create a new project
3. Copy the connection string (it looks like: `postgresql://username:password@host/database?sslmode=require`)
4. Keep this connection string safe - you'll need it later

### Option B: Using Other PostgreSQL Providers
- **Supabase**: Go to supabase.com, create project, get connection string
- **Railway**: Go to railway.app, create PostgreSQL service
- **ElephantSQL**: Go to elephantsql.com, create instance

## Step 2: Push Code to GitHub

1. Create a new repository on GitHub
2. Upload all your project files to the repository
3. Make sure these files are included:
   - `netlify.toml`
   - `netlify/functions/api.js`
   - `shared/schema-compiled.js`
   - All client files in `client/` folder
   - `package.json` with dependencies

## Step 3: Deploy on Netlify

### Connect Repository
1. Log into Netlify
2. Click "New site from Git"
3. Choose GitHub and authorize Netlify
4. Select your repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`

### Environment Variables
1. In Netlify dashboard, go to Site settings → Environment variables
2. Add these variables:
   - **DATABASE_URL**: Your PostgreSQL connection string
   - **NODE_ENV**: `production`

### Deploy
1. Click "Deploy site"
2. Wait for deployment to complete (usually 2-5 minutes)
3. Netlify will provide a URL like `https://amazing-site-123456.netlify.app`

## Step 4: Set Up Database Schema

1. After deployment, you need to create database tables
2. Use any PostgreSQL client (pgAdmin, TablePlus, or online tools)
3. Connect using your DATABASE_URL
4. Run this SQL script:

```sql
-- Create tables
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teachers (
  id SERIAL PRIMARY KEY,
  teacher_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  join_date TEXT,
  username TEXT UNIQUE,
  password TEXT,
  is_portal_enabled BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  absent_category TEXT,
  check_in_time TEXT,
  check_out_time TEXT,
  notes TEXT,
  recorded_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT DEFAULT 'holiday',
  description TEXT
);

-- Insert default admin user
INSERT INTO users (username, password, role, name) 
VALUES ('admin', 'admin123', 'admin', 'System Administrator')
ON CONFLICT (username) DO NOTHING;

-- Insert default departments
INSERT INTO departments (name, description) VALUES 
('Mathematics', 'Mathematics Department'),
('Science', 'Science Department'),
('English', 'English Department'),
('Social Studies', 'Social Studies Department'),
('Physical Education', 'Physical Education Department'),
('Art', 'Art Department'),
('Music', 'Music Department'),
('Computer Science', 'Computer Science Department')
ON CONFLICT (name) DO NOTHING;
```

## Step 5: Configure Custom Domain (Optional)

1. In Netlify dashboard, go to Site settings → Domain management
2. Click "Add custom domain"
3. Enter your domain name
4. Follow DNS configuration instructions
5. Netlify will automatically provision SSL certificate

## Step 6: Test Your Deployment

1. Visit your Netlify URL
2. Try logging in with:
   - Username: `admin`
   - Password: `admin123`
3. Test basic functionality:
   - Add a teacher
   - Mark attendance
   - View dashboard

## Step 7: Production Configuration

### Security
1. **Change default password** immediately after first login
2. **Enable HTTPS** (automatic with Netlify)
3. **Set up backup strategy** for your database

### Performance
1. **Enable Netlify Analytics** in dashboard
2. **Configure caching** (automatic with Netlify)
3. **Monitor function usage** to stay within limits

## Troubleshooting

### Common Issues

**Build Fails**
- Check build logs in Netlify dashboard
- Ensure all dependencies are in package.json
- Verify build command is correct

**Database Connection Issues**
- Verify DATABASE_URL is correct
- Check if database allows external connections
- Ensure SSL mode is configured properly

**Function Timeout**
- Netlify functions have 10-second timeout on free plan
- Optimize database queries
- Consider upgrading to Pro plan for 26-second timeout

**CORS Issues**
- Ensure CORS headers are set in function responses
- Check if API calls use correct URLs

### Netlify Limits (Free Plan)
- **Functions**: 125,000 requests/month
- **Build minutes**: 300/month
- **Bandwidth**: 100GB/month
- **Storage**: 1GB

## Alternative: Simple Static Deployment

If you prefer not to use Netlify Functions, you can deploy as a static site and use external API hosting:

1. Build the frontend only: `npm run build`
2. Deploy the `dist` folder to Netlify
3. Host the backend on:
   - **Railway**: railway.app
   - **Render**: render.com
   - **Heroku**: heroku.com
4. Update API endpoints in frontend to point to your backend URL

## Support

- **Netlify Docs**: docs.netlify.com
- **Netlify Support**: support.netlify.com
- **Community**: community.netlify.com

## Final Checklist

- [ ] Database is set up and accessible
- [ ] Environment variables are configured
- [ ] Site deploys successfully
- [ ] Login works with admin credentials
- [ ] Basic functionality is tested
- [ ] Custom domain is configured (if applicable)
- [ ] Default password is changed
- [ ] Backup strategy is in place

Your School Attendance Management System is now live on Netlify!