#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 Verifying Netlify Deployment Configuration...\n');

// Check required files
const requiredFiles = [
  'netlify.toml',
  'netlify/functions/api.js',
  'shared/schema-compiled.js',
  'package.json',
  'vite.config.ts'
];

const missingFiles = [];
requiredFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.error('❌ Missing required files:');
  missingFiles.forEach(file => console.error(`   - ${file}`));
  process.exit(1);
}

console.log('✅ All required files present');

// Check netlify.toml configuration
const netlifyConfig = fs.readFileSync('netlify.toml', 'utf8');
const requiredConfig = [
  'publish = "dist"',
  'command = "vite build"',
  'directory = "netlify/functions"',
  'from = "/api/*"',
  'to = "/.netlify/functions/:splat"'
];

let configValid = true;
requiredConfig.forEach(config => {
  if (!netlifyConfig.includes(config)) {
    console.error(`❌ Missing configuration: ${config}`);
    configValid = false;
  }
});

if (configValid) {
  console.log('✅ Netlify configuration valid');
} else {
  process.exit(1);
}

// Check package.json dependencies
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = [
  '@neondatabase/serverless',
  'drizzle-orm',
  'bcryptjs',
  'date-fns'
];

const missingDeps = [];
requiredDeps.forEach(dep => {
  if (!packageJson.dependencies[dep]) {
    missingDeps.push(dep);
  }
});

if (missingDeps.length > 0) {
  console.error('❌ Missing dependencies:');
  missingDeps.forEach(dep => console.error(`   - ${dep}`));
  process.exit(1);
}

console.log('✅ All required dependencies present');

// Check function file structure
const functionFile = fs.readFileSync('netlify/functions/api.js', 'utf8');
const requiredFunctions = [
  'handleLogin',
  'handleGetTeachers',
  'handleCreateTeacher',
  'handleGetDepartments',
  'handleStatsOverview',
  'handleGetAttendanceByDate',
  'initializeDatabase'
];

let functionsValid = true;
requiredFunctions.forEach(func => {
  if (!functionFile.includes(`function ${func}`)) {
    console.error(`❌ Missing function: ${func}`);
    functionsValid = false;
  }
});

if (functionsValid) {
  console.log('✅ All API functions implemented');
} else {
  process.exit(1);
}

// Check schema compilation
try {
  const schemaContent = fs.readFileSync('shared/schema-compiled.js', 'utf8');
  if (!schemaContent.includes('users') || !schemaContent.includes('teachers') || !schemaContent.includes('attendanceRecords')) {
    console.error('❌ Schema compilation incomplete');
    process.exit(1);
  }
  console.log('✅ Database schema compiled correctly');
} catch (error) {
  console.error('❌ Schema compilation error:', error.message);
  process.exit(1);
}

console.log('\n🎉 Deployment verification complete!');
console.log('\nNext steps:');
console.log('1. Create database (Neon, Supabase, or Railway)');
console.log('2. Push code to GitHub');
console.log('3. Connect to Netlify');
console.log('4. Set DATABASE_URL environment variable');
console.log('5. Deploy!');