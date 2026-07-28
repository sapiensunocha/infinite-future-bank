-- IFB Venture Stock Exchange
-- Companies apply, Pascaline AI guides them stage by stage until listing

create table if not exists public.ifb_ventures (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade not null,
  company_name      text not null,
  sector            text not null,
  country           text not null,
  description       text,
  website           text,
  founded_year      int,
  team_size         int default 1,
  annual_revenue    numeric(18,2) default 0,
  funding_raised    numeric(18,2) default 0,
  valuation         numeric(18,2) default 0,
  stage             text not null default 'applied'
                    check (stage in ('applied','kyc_review','audit','due_diligence','pre_ipo','listed','rejected')),
  checklist         jsonb default '{}'::jsonb,
  ai_notes          text,
  admin_notes       text,
  ticker_symbol     text unique,
  share_price       numeric(14,4),
  shares_issued     bigint,
  market_cap        numeric(18,2),
  is_public         boolean default false,
  promoted_at       timestamptz,
  listed_at         timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Stage checklist templates (what each stage requires)
create table if not exists public.venture_stage_requirements (
  id          serial primary key,
  stage       text not null,
  item_key    text not null,
  label       text not null,
  description text,
  required    boolean default true,
  sort_order  int default 0
);

-- Seed stage requirements
insert into public.venture_stage_requirements (stage, item_key, label, description, sort_order) values
-- Stage 1: Applied
('applied',       'company_registered',    'Company Legally Registered',         'Provide registration certificate', 1),
('applied',       'founder_id',            'Founder ID Verified',                'Government-issued ID required', 2),
('applied',       'business_plan',         'Business Plan Submitted',            'Executive summary + 3-year projections', 3),
('applied',       'sector_selected',       'Industry Sector Selected',           'Choose from IFB-approved sectors', 4),
-- Stage 2: KYC Review
('kyc_review',    'kyc_passed',            'KYC / AML Cleared',                  'All founders must pass identity checks', 1),
('kyc_review',    'ubo_declared',          'Ultimate Beneficial Owners Declared','All UBOs with >10% stake identified', 2),
('kyc_review',    'sanctions_clear',       'Sanctions Screening Passed',         'No match on OFAC / UN / EU lists', 3),
('kyc_review',    'bank_account_verified', 'Corporate Bank Account Verified',    'Active business bank account required', 4),
-- Stage 3: Audit
('audit',         'financials_submitted',  '3-Year Financials Submitted',        'P&L, Balance Sheet, Cash Flow statements', 1),
('audit',         'revenue_verified',      'Revenue Model Verified',             'Pascaline audits revenue consistency', 2),
('audit',         'burn_rate_ok',          'Burn Rate Within Thresholds',        'Monthly burn must be sustainable vs runway', 3),
('audit',         'debt_ratio_ok',         'Debt-to-Equity Ratio Acceptable',    'D/E ratio below 3.0 for most sectors', 4),
('audit',         'ifb_audit_passed',      'IFB Audit Score ≥ 70',              'Run the IFB Audit tool and submit results', 5),
-- Stage 4: Due Diligence
('due_diligence', 'cap_table_clean',       'Cap Table Verified',                 'Shareholders, options, and warrants documented', 1),
('due_diligence', 'ip_rights_clear',       'IP Rights Confirmed',                'Trademarks, patents, or licenses secured', 2),
('due_diligence', 'legal_structure_ok',    'Legal Structure Approved',           'No pending litigation or compliance issues', 3),
('due_diligence', 'board_formed',          'Board of Directors Formed',          'Minimum 3 board members including 1 independent', 4),
('due_diligence', 'governance_docs',       'Governance Documents Ready',         'Articles of incorporation, shareholder agreements', 5),
-- Stage 5: Pre-IPO
('pre_ipo',       'valuation_agreed',      'Valuation Agreed with IFB',          'Fair market value set by Pascaline engine', 1),
('pre_ipo',       'prospectus_filed',      'Offering Prospectus Filed',          'IFB-standard prospectus document submitted', 2),
('pre_ipo',       'ticker_reserved',       'Ticker Symbol Reserved',             'Unique 3-5 letter ticker assigned', 3),
('pre_ipo',       'share_structure_set',   'Share Structure Finalized',          'Total shares, par value, and price band set', 4),
('pre_ipo',       'roadshow_done',         'Roadshow / Investor Briefing Done',  'Presentation to IFB investor network', 5),
-- Stage 6: Listed
('listed',        'ipo_complete',          'IPO Complete',                       'Shares issued and trading live on IFB VSE', 1),
('listed',        'reporting_quarterly',   'Quarterly Reporting Active',         'Committed to quarterly financial disclosures', 2),
('listed',        'market_maker_assigned', 'Market Maker Assigned',              'IFB liquidity provider assigned to ticker', 3)
on conflict do nothing;

-- RLS
alter table public.ifb_ventures enable row level security;
alter table public.venture_stage_requirements enable row level security;

-- Policies: users see their own ventures; admins see all
create policy "users_own_ventures" on public.ifb_ventures
  for all using (auth.uid() = user_id);

create policy "admins_all_ventures" on public.ifb_ventures
  for all using (
    exists (
      select 1 from public.admin_roles
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "stage_requirements_public_read" on public.venture_stage_requirements
  for select using (true);

-- Trigger to update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists ventures_updated_at on public.ifb_ventures;
create trigger ventures_updated_at
  before update on public.ifb_ventures
  for each row execute function public.set_updated_at();
