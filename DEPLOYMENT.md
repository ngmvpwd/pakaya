# Netlify Deployment Guide

This guide explains how to deploy the School Attendance Management System to Netlify.

## Prerequisites

1. **GitHub Account**: Your code must be in a GitHub repository
2. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
3. **Database**: You'll need a PostgreSQL database (recommend Neon, Supabase, or Railway)

## Database Setup

### Option 1: Neon (Recommended)
1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy the connection string (looks like: `postgresql://username:password@host/database`)

### Option 2: Supabase
1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Go to Settings > Database and copy the connection string

### Option 3: Railway
1. Go to [railway.app](https://railway.app)
2. Create a new project with PostgreSQL
3. Copy the connection string from the database service

## Netlify Deployment Steps

### Step 1: Prepare Your Repository
1. Push your code to GitHub
2. Make sure your `package.json` has the correct build scripts:
   ```json
   {
     "scripts": {
       "build": "npm run build:client && npm run build:server",
       "build:client": "vite build",
       "build:server": "tsc server/index.ts --outDir dist/server --target es2020 --module commonjs --moduleResolution node --esModuleInterop",
       "start": "node dist/server/index.js"
     }
   }
   ```

### Step 2: Connect to Netlify
1. Log in to [netlify.com](https://netlify.com)
2. Click "New site from Git"
3. Choose GitHub and authorize access
4. Select your repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist/client`
   - **Functions directory**: `netlify/functions`

### Step 3: Environment Variables
1. In Netlify dashboard, go to Site settings > Environment variables
2. Add the following variables:
   ```
   DATABASE_URL=your_postgresql_connection_string
   NODE_ENV=production
   ```

### Step 4: Netlify Functions Setup
Create a `netlify/functions` directory and add an API handler:

```javascript
// netlify/functions/api.js
const express = require('express');
const serverless = require('serverless-http');
const { registerRoutes } = require('../../dist/server/routes');

const app = express();

// Initialize your Express app with routes
registerRoutes(app);

module.exports.handler = serverless(app);
```

### Step 5: Netlify Configuration
Create a `netlify.toml` file in your project root:

```toml
[build]
  command = "npm run build"
  functions = "netlify/functions"
  publish = "dist/client"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Step 6: Database Migration
1. After deployment, you'll need to run database migrations
2. Use Netlify CLI or add a build hook to run:
   ```bash
   npm run db:push
   ```

## Alternative: Full-Stack Deployment on Railway

If Netlify functions are complex, consider Railway for full-stack deployment:

### Railway Deployment
1. Go to [railway.app](https://railway.app)
2. Create new project from GitHub repo
3. Add PostgreSQL service
4. Set environment variables:
   ```
   DATABASE_URL=postgresql://...
   PORT=5000
   ```
5. Railway will auto-deploy on git push

## Environment Variables Needed

```env
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=production
PORT=5000
```

## Build Commands

### For Netlify:
```bash
npm install
npm run build:client
```

### For Railway/Full-Stack:
```bash
npm install
npm run build
npm start
```

## Troubleshooting

### Common Issues:

1. **Database Connection**: Ensure your DATABASE_URL is correct and the database is accessible
2. **Build Failures**: Check that all dependencies are in `package.json`
3. **API Routes**: Verify Netlify redirects are working correctly
4. **CORS Issues**: Add proper CORS headers in production

### Deployment Checklist:
- [ ] Code pushed to GitHub
- [ ] Database created and connection string obtained
- [ ] Netlify site created and connected to repo
- [ ] Environment variables configured
- [ ] Build settings configured
- [ ] Database schema deployed
- [ ] Test login functionality
- [ ] Test attendance recording
- [ ] Test report generation

## Post-Deployment

1. **Test the application** thoroughly
2. **Set up monitoring** (Netlify provides basic analytics)
3. **Configure custom domain** if needed
4. **Set up backups** for your database
5. **Monitor performance** and optimize as needed

## Support

If you encounter issues:
1. Check Netlify deploy logs
2. Verify database connectivity
3. Test API endpoints individually
4. Check browser console for frontend errors

The system should be fully functional once deployed with proper database connectivity and environment variables configured.