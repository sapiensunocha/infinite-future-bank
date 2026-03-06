import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// 1. Initialize Supabase (Use your actual URL and SERVICE ROLE KEY)
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must be Service Role for Admin access
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Initialize the MCP Server
const server = new Server({
  name: "IFB-Pascaline-Core",
  version: "1.0.0",
}, {
  capabilities: { tools: {} }
});

// 3. Define the Tools Pascaline is allowed to use
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_pending_companies",
        description: "Fetch all commercial profiles currently waiting for Pascaline AI underwriting.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "underwrite_company",
        description: "Approve or reject a company for the IFB Dark Pool based on telemetry. Updates the database.",
        inputSchema: {
          type: "object",
          properties: {
            companyId: { type: "string", description: "The UUID of the company" },
            decision: { type: "string", enum: ["eligible_for_funding", "rejected"], description: "The final underwriting decision" },
            riskScore: { type: "number", description: "Pascaline calculated risk score (1-99)" },
            growthScore: { type: "number", description: "Pascaline calculated growth score (1-99)" }
          },
          required: ["companyId", "decision", "riskScore", "growthScore"]
        }
      },
      {
        name: "get_client_portfolio",
        description: "Look up a user's liquid cash, alpha equity, and digital safe balances to provide financial advice.",
        inputSchema: {
          type: "object",
          properties: {
            userId: { type: "string", description: "The UUID of the user" }
          },
          required: ["userId"]
        }
      }
    ]
  };
});

// 4. Execute the Logic when the AI calls a Tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get_pending_companies") {
      const { data, error } = await supabase.from('commercial_profiles').select('*').eq('pascaline_status', 'pending_review');
      if (error) throw error;
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "underwrite_company") {
      const { companyId, decision, riskScore, growthScore } = args as any;
      const { data, error } = await supabase.from('commercial_profiles').update({
        pascaline_status: decision,
        ai_risk_score: riskScore,
        ai_growth_score: growthScore
      }).eq('id', companyId).select();
      
      if (error) throw error;
      return { content: [{ type: "text", text: `Successfully underwrote company. Status updated to: ${decision}` }] };
    }

    if (name === "get_client_portfolio") {
      const { userId } = args as any;
      const { data, error } = await supabase.from('balances').select('*').eq('user_id', userId).single();
      if (error) throw error;
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (error: any) {
    return { content: [{ type: "text", text: `Error executing tool: ${error.message}` }], isError: true };
  }
});

// 5. Start the Server via Standard Input/Output (stdio)
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Pascaline MCP Server running on stdio");
}

main().catch(console.error);