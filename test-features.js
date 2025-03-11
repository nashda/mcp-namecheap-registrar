import CheckDomainTool from './dist/tools/CheckDomainTool.js';
import GetPricingTool from './dist/tools/GetPricingTool.js';
import RegisterDomainTool from './dist/tools/RegisterDomainTool.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runTests() {
  // Test 1: Domain Availability Check
  const checkTool = new CheckDomainTool();
  const randomString = Math.random().toString(36).substring(2, 8);
  const testDomain = `test-${randomString}-domain.xyz`;
  
  console.log(`\n===== TESTING DOMAIN CHECK =====`);
  console.log(`Checking domain: ${testDomain}`);
  
  try {
    const checkResult = await checkTool.execute({ domain: testDomain });
    console.log(`Result: ${checkResult}`);
  } catch (error) {
    console.error(`Domain check failed: ${error.message}`);
    process.exit(1);
  }
  
  // Test 2: Domain Pricing
  const pricingTool = new GetPricingTool();
  
  console.log(`\n===== TESTING PRICING LOOKUP =====`);
  console.log(`Getting pricing for TLD: xyz`);
  
  try {
    const pricingResult = await pricingTool.execute({ tld: 'xyz' });
    console.log(`Pricing result obtained successfully`);
    console.log(pricingResult);
  } catch (error) {
    console.error(`Pricing lookup failed: ${error.message}`);
    process.exit(1);
  }
  
  // Test 3: Domain Registration (without confirming purchase)
  const regTool = new RegisterDomainTool();
  
  console.log(`\n===== TESTING REGISTRATION PROCESS =====`);
  console.log(`Testing registration for domain: ${testDomain}`);
  
  try {
    const regResult = await regTool.execute({ 
      domain: testDomain,
      years: 1,
      confirmPurchase: false // Don't actually purchase
    });
    console.log(`Registration check successful`);
    console.log(regResult);
  } catch (error) {
    console.error(`Registration process failed: ${error.message}`);
    process.exit(1);
  }
  
  console.log(`\n===== ALL TESTS PASSED =====`);
  console.log(`The MCP server's core features are working correctly without logging.`);
}

runTests().catch(error => {
  console.error(`Test suite failed: ${error.message}`);
  process.exit(1);
}); 