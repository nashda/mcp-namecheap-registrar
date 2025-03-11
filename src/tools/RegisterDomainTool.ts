import { MCPTool } from "mcp-framework";
import { z } from "zod";
import axios from "axios";
import * as xml2js from "xml2js";
import { detectPublicIp, resetIpCache } from "../utils/ipDetection.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RegisterDomainInput {
  domain: string;
  years?: number;
  nameservers?: string;
  confirmPurchase?: boolean;
  enableWhoisPrivacy?: boolean;
}

// Interface for registrant contact information
interface RegistrantProfile {
  firstName: string;
  lastName: string;
  organization?: string;
  address1: string;
  address2?: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
}

// Define a proper MCP response structure
interface MCPResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    resource?: string;
  }>;
}

class RegisterDomainTool extends MCPTool<RegisterDomainInput> {
  name = "register_domain";
  description = "Start the process of registering a domain name";

  schema = {
    domain: {
      type: z.string(),
      description: "Domain name to register (e.g., example.com)",
    },
    years: {
      type: z.number().optional(),
      description: "Number of years to register the domain for (default: 1)",
    },
    nameservers: {
      type: z.string().optional(),
      description: "Optional comma-separated list of nameservers",
    },
    confirmPurchase: {
      type: z.boolean().optional(),
      description: "Set to true to confirm and complete the purchase (default: false)",
    },
    enableWhoisPrivacy: {
      type: z.boolean().optional(),
      description: "Enable WhoisGuard privacy protection (default: true)",
    }
  };

  // Format response according to MCP requirements
  private formatTextResponse(message: string): MCPResponse {
    return {
      content: [
        {
          type: 'text',
          text: message,
          // These fields are required for MCP responses
          data: '', 
          mimeType: 'text/plain'
        }
      ]
    };
  }

  async execute(input: RegisterDomainInput) {
    const { 
      domain, 
      years = 1, 
      nameservers, 
      confirmPurchase = false,
      enableWhoisPrivacy = true 
    } = input;
    
    try {
      // Check availability first
      const apiResponse = await (this as any).callNamecheapApi('namecheap.domains.check', {
        DomainList: domain
      });
      
      const result = apiResponse.CommandResponse.DomainCheckResult;
      const available = result.$.Available === 'true';
      const isPremium = result.$.IsPremiumName === 'true';
      
      if (!available) {
        return this.formatTextResponse(`Domain ${domain} is not available for registration.`);
      }
      
      // Try to load registrant profile
      let registrantProfile: RegistrantProfile | null = null;
      try {
        registrantProfile = (this as any).loadRegistrantProfile();
      } catch (profileError) {
        return this.formatTextResponse(`
Domain ${domain} is available for registration!

However, I could not find a registrant profile for contact information.
Please create a file named "registrant-profile.json" in the project root with your contact details.
You can use "registrant-profile.example.json" as a template.
`);
      }
      
      // Get domain pricing information
      let pricingInfo: string;
      try {
        pricingInfo = await (this as any).getDomainPricing(domain, years);
      } catch (pricingError) {
        pricingInfo = 'Pricing information unavailable';
      }
      
      // Display domain registration information and pricing
      const formattedProfile = (this as any).formatProfileForDisplay(registrantProfile);
      
      // If this is not a purchase confirmation, show registration details
      if (!confirmPurchase) {
        const premiumWarning = isPremium ? `
⚠️ PREMIUM DOMAIN NOTICE ⚠️
This is a premium domain name that may have a higher registration fee than standard domains.
` : '';
        
        return this.formatTextResponse(`
Domain ${domain} is available for registration!
${premiumWarning}
${pricingInfo}

Registration details:
- Domain: ${domain}
- Period: ${years} year(s)
${nameservers ? `- Custom nameservers: ${nameservers}` : '- Default nameservers will be used'}
- WhoisGuard Privacy: ${enableWhoisPrivacy ? 'Enabled' : 'Disabled'}

Contact information from your registrant profile:
${formattedProfile}

To complete the registration, run this command again with confirmPurchase=true.
⚠️ Your Namecheap account will be charged for this purchase. ⚠️
`);
      }
      
      // If we get here, the user has confirmed they want to purchase the domain
      
      // Format the contact information for the API
      const contactInfo = (this as any).formatContactInfoForApi(registrantProfile);
      
      // If custom nameservers are provided, add them to the API parameters
      const nameserversParam: Record<string, string> = {};
      if (nameservers) {
        const nameserverList = nameservers.split(',').map(ns => ns.trim());
        nameserverList.forEach((ns, index) => {
          nameserversParam[`Nameserver${index + 1}`] = ns;
        });
      }
      
      // Build parameters for domain creation
      try {
        // Make API call to register the domain
        const domainResponse = await (this as any).callNamecheapApi('namecheap.domains.create', {
          DomainName: domain,
          Years: years.toString(),
          AddFreeWhoisguard: enableWhoisPrivacy ? 'yes' : 'no',
          WGEnabled: enableWhoisPrivacy ? 'yes' : 'no',
          ...contactInfo,
          ...nameserversParam
        });
        
        // Check if the domain was successfully registered
        if (domainResponse.CommandResponse && domainResponse.CommandResponse.DomainCreateResult) {
          const createResult = domainResponse.CommandResponse.DomainCreateResult;
          
          // If OrderID is present, the domain was registered successfully
          if (createResult.$ && createResult.$.OrderID) {
            return this.formatTextResponse(`
✅ Success! Domain ${domain} has been registered!

Order ID: ${createResult.$.OrderID}
Transaction ID: ${createResult.$.TransactionID}
Registration Date: ${createResult.$.RegisterDate || 'Immediate'}

WhoisGuard: ${enableWhoisPrivacy ? 'Enabled' : 'Disabled'}
Nameservers: ${nameservers || 'Default Namecheap DNS'}

You can manage your new domain through your Namecheap account dashboard.
`);
          }
        }
        
        // If we didn't get expected response format
        return this.formatTextResponse(`
Something went wrong with the domain registration process.
Please check your Namecheap account to see if the domain was registered.
The API response did not contain the expected confirmation details.
`);
      } catch (purchaseError) {
        // Detailed error message for purchase failures
        return this.formatTextResponse(`
⚠️ Domain purchase failed!

There was an error while attempting to register ${domain}:
${purchaseError instanceof Error ? purchaseError.message : 'Unknown error'}

No charges have been applied to your account. Please try again later or check
your Namecheap account status and API limits.
`);
      }
    } catch (error) {
      if (error instanceof Error) {
        return this.formatTextResponse(`Error registering domain: ${error.message}`);
      }
      return this.formatTextResponse(`Error registering domain: Unknown error`);
    }
  }

  // Other necessary methods and properties...
}

export default RegisterDomainTool; 