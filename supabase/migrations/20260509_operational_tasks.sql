-- ============================================================
-- Operational Task Tracking: Replaces UI Simulations
-- Used by Agents, SOS, and AI Mentor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.operational_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL, -- 'agent_mission', 'sos_routing', 'ai_audit'
  title TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'failed')),
  current_step_index INTEGER DEFAULT 0,
  current_detail TEXT,
  progress_pct INTEGER DEFAULT 0,
  steps JSONB NOT NULL DEFAULT '[]', -- Array of { text, status }
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.operational_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_own_read" ON public.operational_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tasks_own_insert" ON public.operational_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_own_update" ON public.operational_tasks FOR UPDATE USING (auth.uid() = user_id);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.operational_tasks;
