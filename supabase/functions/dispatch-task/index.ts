// dispatch-task
// Backend engine for long-running operational tasks (Agents, SOS, Audits)
// Simulates background processing by updating the operational_tasks table

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const authHeader = req.headers.get("Authorization");
  const { data: { user } } = await sb.auth.getUser(authHeader?.split(" ")[1] || "");
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const { task_type, title, steps, metadata } = await req.json();

  if (!task_type || !title || !steps) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders });
  }

  // 1. Create the task record
  const { data: task, error: createError } = await sb.from("operational_tasks").insert([{
    user_id: user.id,
    task_type,
    title,
    steps: steps.map((s: string) => ({ text: s, status: "pending" })),
    current_detail: "Initializing...",
    status: "active",
    metadata
  }]).select().single();

  if (createError) return new Response(JSON.stringify({ error: createError.message }), { status: 500, headers: corsHeaders });

  // 2. Start 'async' processing (in Edge Functions we can't really do long-running background 
  // without returning, but we can return the task ID immediately and let another process handle it,
  // or for this demo, we'll do a quick sequence before returning OR just return and let frontend know it started)
  
  // We'll return immediately so the frontend can start listening
  return new Response(JSON.stringify({ task_id: task.id }), { 
    status: 200, 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
});
