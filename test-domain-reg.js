// Test script for RegisterDomainTool
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as xml2js from 'xml2js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const NAMECHEAP_API_KEY = process.env.NAMECHEAP_API_KEY;
const NAMECHEAP_USERNAME = process.env.NAMECHEAP_USERNAME;
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.namecheap.com/xml.response'
  : 'https://api.sandbox.namecheap.com/xml.response';

// Function to detect public IP
async function detectPublicIp() {
  try {
    const response = await axios.get('https://api.ipify.org');
    return response.data.toString().trim();
  } catch (error) {
    console.error('Error detecting IP:', error.message);
    return '127.0.0.1'; // Fallback
  }
}

// RegistrantProfile interface
const requiredFields = ['firstName', 'lastName', 'address1', 'city', 
                         'stateProvince', 'postalCode', 'country', 
                         'phone', 'email'];

// Test loading the profile
function testLoadProfile() {
  console.log('Testing registrant profile loading...');
  
  // Determine project root directory
  const projectRoot = process.cwd();
  const profilePath = path.join(projectRoot, 'registrant-profile.json');
  
  console.log(`Looking for profile at: ${profilePath}`);
  console.log(`Current working directory: ${projectRoot}`);
  console.log(`Files in directory:`, fs.readdirSync(projectRoot).join(', '));
  
  if (!fs.existsSync(profilePath)) {
    console.error(`Registrant profile not found at ${profilePath}`);
    return null;
  }
  
  try {
    console.log('Found registrant profile, attempting to read');
    const profileData = fs.readFileSync(profilePath, 'utf8');
    const profile = JSON.parse(profileData);
    
    console.log('Successfully parsed registrant profile');
    
    // Validate required fields
    const missingFields = [];
    for (const field of requiredFields) {
      if (!profile[field]) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      console.error(`Profile is missing required fields: ${missingFields.join(', ')}`);
      return null;
    }
    
    console.log('Profile validation successful');
    console.log('Profile data:', profile);
    return profile;
  } catch (error) {
    console.error('Error loading profile:', error);
    return null;
  }
}

// Function to check domain availability
async function checkDomain(domain) {
  try {
    const ip = await detectPublicIp();
    
    const requestParams = {
      ApiUser: NAMECHEAP_USERNAME,
      ApiKey: NAMECHEAP_API_KEY,
      UserName: NAMECHEAP_USERNAME,
      ClientIp: ip,
      Command: 'namecheap.domains.check',
      DomainList: domain
    };
    
    const response = await axios.get(API_URL, { params: requestParams });
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);
    
    if (result.ApiResponse.Status === 'ERROR') {
      throw new Error(`API Error: ${result.ApiResponse.Errors.Error}`);
    }
    
    const checkResult = result.ApiResponse.CommandResponse.DomainCheckResult;
    const available = checkResult.$.Available === 'true';
    
    console.log(`Domain ${domain} is ${available ? 'available' : 'unavailable'} for registration.`);
    
    if (available) {
      // Simulate RegisterDomainTool behavior
      const profile = testLoadProfile();
      
      if (profile) {
        console.log('\nRegistration details:');
        console.log(`- Domain: ${domain}`);
        console.log('- Period: 1 year(s)');
        console.log('- Default nameservers will be used');
        
        console.log('\nContact information from your registrant profile:');
        console.log(`- Name: ${profile.firstName} ${profile.lastName}`);
        if (profile.organization) console.log(`- Organization: ${profile.organization}`);
        console.log(`- Address: ${profile.address1}${profile.address2 ? `, ${profile.address2}` : ''}`);
        console.log(`- City: ${profile.city}`);
        console.log(`- State/Province: ${profile.stateProvince}`);
        console.log(`- Postal Code: ${profile.postalCode}`);
        console.log(`- Country: ${profile.country}`);
        console.log(`- Phone: ${profile.phone}`);
        console.log(`- Email: ${profile.email}`);
      } else {
        console.log('\nCould not load registrant profile for contact information.');
        console.log('Please create a file named "registrant-profile.json" in the project root.');
      }
    }
    
    return available;
  } catch (error) {
    console.error('Error checking domain:', error);
    return null;
  }
}

// Run the test
async function runTest() {
  // Test register domain with a random domain that's likely available
  const randomString = Math.random().toString(36).substring(2, 8);
  const testDomain = `test-${randomString}-domain.xyz`;
  console.log(`Testing with random domain: ${testDomain}`);
  await checkDomain(testDomain);
}

runTest().catch(console.error); 