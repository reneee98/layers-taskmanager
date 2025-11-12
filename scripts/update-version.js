#!/usr/bin/env node

/**
 * Script to read version from package.json
 * Version format: standard semver (e.g., 1.0.0)
 */

const fs = require('fs');
const path = require('path');

// Get package.json path
const packagePath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Read current version (no automatic updates)
const currentVersion = packageJson.version || '1.0.0';

console.log(`✅ Current version: ${currentVersion}`);

