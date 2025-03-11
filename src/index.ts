import { MCPServer } from "mcp-framework";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create and configure the server
const server = new MCPServer({
  name: "namecheap-domains",
  version: "1.0.0"
});

// Start the server
server.start(); 