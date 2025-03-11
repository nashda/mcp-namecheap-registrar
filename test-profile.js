// Simple script to test loading the registrant profile
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test method 1: Using current working directory
console.log('Method 1: Using process.cwd()');
const projectRoot1 = process.cwd();
const profilePath1 = path.join(projectRoot1, 'registrant-profile.json');
console.log(`Looking for profile at: ${profilePath1}`);
console.log(`File exists: ${fs.existsSync(profilePath1)}`);

if (fs.existsSync(profilePath1)) {
  try {
    const profileData = fs.readFileSync(profilePath1, 'utf8');
    const profile = JSON.parse(profileData);
    console.log('Successfully loaded profile:');
    console.log(JSON.stringify(profile, null, 2));
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

// Test method 2: Using script directory
console.log('\nMethod 2: Using __dirname');
const projectRoot2 = __dirname;
const profilePath2 = path.join(projectRoot2, 'registrant-profile.json');
console.log(`Looking for profile at: ${profilePath2}`);
console.log(`File exists: ${fs.existsSync(profilePath2)}`);

// Test method 3: Using absolute path
console.log('\nMethod 3: Using absolute path');
const profilePath3 = '/Users/dalton/Documents/cloudflare-registrar-mcp/registrant-profile.json';
console.log(`Looking for profile at: ${profilePath3}`);
console.log(`File exists: ${fs.existsSync(profilePath3)}`);

// Print current directory and files for debugging
console.log('\nDebugging information:');
console.log(`Current directory: ${process.cwd()}`);
console.log('Files in current directory:');
fs.readdirSync(process.cwd()).forEach(file => {
  console.log(`- ${file}`);
}); 