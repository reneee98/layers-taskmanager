#!/usr/bin/env node

/**
 * Script to update version in package.json based on Vercel deployment info
 * Format: 1.0.0-alpha.{timestamp}
 */

const fs = require('fs');
const path = require('path');

// Get package.json path
const packagePath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Generate version based on environment
let newVersion = '1.0.0-alpha';

if (process.env.VERCEL) {
  // On Vercel, use deployment info
  const timestamp = Date.now();
  const shortCommit = process.env.VERCEL_GIT_COMMIT_SHA 
    ? process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7)
    : timestamp.toString().slice(-8);
  
  // Format: 1.0.0-alpha.{timestamp}
  newVersion = `1.0.0-alpha.${timestamp}`;
  
  // Alternative: Use commit SHA (shorter but less readable)
  // newVersion = `1.0.0-alpha.${shortCommit}`;
} else {
  // Local development - use timestamp
  const timestamp = Date.now();
  newVersion = `1.0.0-alpha.${timestamp}`;
}

// Update package.json
packageJson.version = newVersion;

// Write back to file
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`✅ Version updated to: ${newVersion}`);
console.log(`   Deployment URL: ${process.env.VERCEL_URL || 'local'}`);
console.log(`   Commit SHA: ${process.env.VERCEL_GIT_COMMIT_SHA || 'N/A'}`);

