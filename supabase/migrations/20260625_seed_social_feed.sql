-- ============================================================
-- VentureX Social Feed Seed — 60 realistic company posts
-- Updates, milestones, deals, hiring, launches, community
-- ============================================================
DO $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users ORDER BY created_at LIMIT 1;
  IF v_uid IS NULL THEN RAISE NOTICE 'No users found — skipping social seed'; RETURN; END IF;

  -- Skip if already seeded
  IF (SELECT COUNT(*) FROM public.social_posts WHERE author_id = v_uid) > 20 THEN
    RAISE NOTICE 'Social feed already seeded — skipping'; RETURN;
  END IF;

  INSERT INTO public.social_posts (author_id, content, media_urls, media_types, like_count, love_count, total_revenue, created_at) VALUES

  -- === FLUTTERWAVE ===
  (v_uid,
   '🚀 Big news: Flutterwave just processed its 500 millionth transaction. From a small Lagos office to half a billion payments across 34 countries — this is what building for Africa looks like. Thank you to every merchant, developer, and partner who believed in us. The next billion is coming. 💳',
   '["https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800"]', '["image"]',
   4821, 1203, 0, NOW() - INTERVAL '2 hours'),

  (v_uid,
   'We are officially live in Ethiopia 🇪🇹. Ethiopian businesses can now accept payments from 150+ countries using Flutterwave. The market has been waiting — and we are ready. Apply for early access at flutterwave.com/ethiopia',
   '["https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=800"]', '["image"]',
   2934, 876, 0, NOW() - INTERVAL '18 hours'),

  (v_uid,
   'Hiring: 40 open roles across Engineering, Product, and Risk. We are building the financial infrastructure Africa deserves and we need the best minds on the continent. Competitive comp, remote-friendly, real impact. Check the link in bio. 🛠️',
   '[]', '[]',
   1245, 432, 0, NOW() - INTERVAL '3 days'),

  -- === PAYSTACK ===
  (v_uid,
   'Paystack Terminal is now available to merchants in 4 new cities — Abuja, Port Harcourt, Kumasi, and Accra. Accept cards, mobile money, and bank transfers at the point of sale. No monthly fees for the first 3 months. 📱',
   '["https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800"]', '["image"]',
   3102, 945, 0, NOW() - INTERVAL '5 hours'),

  (v_uid,
   'Four years ago we were a small team in a Lagos apartment. Today we processed over $10B in annual payment volume. Stripe acquiring us changed everything — but the mission stays the same: make it easy for African businesses to get paid. 🙏',
   '[]', '[]',
   5621, 2104, 0, NOW() - INTERVAL '1 day'),

  -- === MONIEPOINT ===
  (v_uid,
   'Moniepoint crosses 2 million active business accounts. In a country where millions of SMEs were unbanked, we chose to build banking that actually works. Agents in every LGA. Loans approved in 48 hours. This is just the beginning. 🏦 #FinTech #Nigeria',
   '["https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800"]', '["image"]',
   3876, 1102, 0, NOW() - INTERVAL '12 hours'),

  (v_uid,
   'We just disbursed ₦50 billion in working capital loans to Nigerian SMEs this quarter. Average loan: ₦2.5M. Average approval time: 31 hours. Zero physical branch visits required. This is what financial inclusion looks like in practice. 📊',
   '[]', '[]',
   2890, 981, 0, NOW() - INTERVAL '2 days'),

  -- === OPAY ===
  (v_uid,
   'OPay Nigeria celebrates 35 million registered users. We started with motorcycles and food delivery. Today we are Nigeria''s fastest-growing digital bank. Our agents move more cash than most traditional banks. Building for the real Nigeria. 🇳🇬',
   '["https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=800"]', '["image"]',
   4234, 1567, 0, NOW() - INTERVAL '6 hours'),

  -- === M-PESA ===
  (v_uid,
   'M-PESA turns 17 years old. When we launched in 2007, people said Kenyans wouldn''t trust their phones with money. Today we serve 51 million customers across 7 countries. $314 billion moved last year. Never underestimate what people will do when you solve a real problem. 🌍',
   '["https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800"]', '["image"]',
   8902, 3241, 0, NOW() - INTERVAL '1 day'),

  (v_uid,
   'M-PESA Global now lets customers in Kenya send money directly to M-PESA users in 50+ countries. Real-time. Under 1 minute. At a fraction of traditional remittance costs. Diaspora transfer just got simpler. 💸',
   '[]', '[]',
   3401, 1201, 0, NOW() - INTERVAL '4 days'),

  -- === CHIPPER CASH ===
  (v_uid,
   'Chipper Cash just crossed 5 million users across Africa. No fees. Instant transfers. 7 countries. Our mission: make sending money across African borders as easy as sending a text. We''re not stopping here. 🔄',
   '["https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800"]', '["image"]',
   2103, 876, 0, NOW() - INTERVAL '8 hours'),

  -- === WAVE MOBILE MONEY ===
  (v_uid,
   'Wave crosses $2B in annualized transaction volume in Francophone Africa. We charge 1% per transaction. No monthly fees. No hidden charges. Senegal, Côte d''Ivoire, Mali, Burkina Faso — the wave is spreading. 🌊 Prochaine étape: 10 pays.',
   '[]', '[]',
   1876, 632, 0, NOW() - INTERVAL '3 hours'),

  -- === ANDELA ===
  (v_uid,
   'Andela has now placed 200,000+ African developers with global tech companies. Our average developer earns 10x the local salary. This is not charity — it''s a market correction. African talent has always been world-class. Now the world knows it. 💻🌍',
   '["https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800"]', '["image"]',
   5234, 1890, 0, NOW() - INTERVAL '2 days'),

  (v_uid,
   'We just launched Andela Talent Cloud — AI-powered talent matching for senior engineers. Get vetted African engineers on your team in under 14 days. 8,000+ expert-verified profiles. Global companies: your next engineering team is on this continent. 🤝',
   '[]', '[]',
   2341, 876, 0, NOW() - INTERVAL '7 hours'),

  -- === INTERSWITCH ===
  (v_uid,
   'Interswitch rings the bell at the Lagos Stock Exchange for our 22nd anniversary. From the company that built Nigeria''s first ATM switching network to a pan-African fintech giant processing $24B annually — we are proud to have built the rails Africa runs on. 🏗️',
   '["https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=800"]', '["image"]',
   4102, 1503, 0, NOW() - INTERVAL '1 day'),

  -- === SAFARICOM ===
  (v_uid,
   'Safaricom Spark Fund invests in 12 Kenyan startups this quarter. Combined they have created 2,400 jobs and serve 800,000 customers. We believe the best entrepreneurs in Kenya deserve Kenyan capital behind them. Applications for Q3 cohort now open. 🇰🇪',
   '[]', '[]',
   1923, 703, 0, NOW() - INTERVAL '5 hours'),

  -- === JUMIA ===
  (v_uid,
   'Jumia Q2 results: GMV up 34% YoY. Orders up 28%. Jumia Pay adoption now at 68% of checkout. Nigeria, Morocco, Kenya, and Egypt are our four crown jewels. African e-commerce is not a question of if — it''s a question of when. And when is now. 📦',
   '["https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800"]', '["image"]',
   2109, 764, 0, NOW() - INTERVAL '3 days'),

  -- === TWIGA FOODS ===
  (v_uid,
   'Twiga Foods delivers fresh produce to 12,000 retailers across Nairobi — every single day. No more rotting mangoes in wholesale markets. No more farmer earning 20% of the retail price. We cut waste, we cut middlemen, we grow together. 🥭🌽 #AgriTech #Kenya',
   '[]', '[]',
   1654, 598, 0, NOW() - INTERVAL '14 hours'),

  -- === HELIOS INVESTMENT ===
  (v_uid,
   'Helios Investment Partners closes Fund IV at $1.1B — the largest Africa-focused private equity fund of the year. We are deploying into infrastructure, financial services, and consumer businesses. Africa''s growth story is being written by African hands. 💼',
   '["https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800"]', '["image"]',
   2876, 1103, 0, NOW() - INTERVAL '6 days'),

  -- === TUGENDE ===
  (v_uid,
   'Tugende just hit 80,000 motorcycle taxi owners financed in Uganda and Kenya. These riders earn 3x more than before financing. They own an asset. They build credit. They have insurance. One motorcycle, one family changed. 80,000 families. 🏍️',
   '[]', '[]',
   3201, 1089, 0, NOW() - INTERVAL '9 hours'),

  -- === FARMART ===
  (v_uid,
   'FarMart connects 1.2 million farmers in India to markets, credit, and inputs. We just raised our Series B to expand to 5 new states. If you can solve agriculture, you solve hunger and poverty simultaneously. Proud of the team. 🌾',
   '["https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800"]', '["image"]',
   1432, 512, 0, NOW() - INTERVAL '4 days'),

  -- === LIFESTORES PHARMACY ===
  (v_uid,
   'Lifestores now has 400 affiliate pharmacies in Nigeria on our B2B supply platform. We source, we deliver, we finance. A pharmacist in Kano now gets the same buying power as a Lagos chain. Healthcare access starts with supply chain. 💊',
   '[]', '[]',
   987, 341, 0, NOW() - INTERVAL '2 days'),

  -- === PAGA ===
  (v_uid,
   'Paga hits 25 million customers in Nigeria and Mexico. We started in Nigeria believing every person deserves a financial identity. 14 years later — $4.4B moved last year. We are not done. Ethiopia and Philippines coming in 2026. 🌐',
   '["https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800"]', '["image"]',
   2341, 876, 0, NOW() - INTERVAL '11 hours'),

  -- === LORI SYSTEMS ===
  (v_uid,
   'Lori Systems just completed 2 million truck deliveries across Sub-Saharan Africa. We digitized a logistics industry that was running on phone calls and paper. Every truck on our network earns 40% more. Every shipper pays 20% less. That''s how you solve logistics. 🚛',
   '[]', '[]',
   1543, 567, 0, NOW() - INTERVAL '8 hours'),

  -- === ZIPLINE ===
  (v_uid,
   'Zipline delivers its 1 millionth medical package by drone. Blood, vaccines, insulin — delivered in under 30 minutes to hospitals that used to wait days. Rwanda, Ghana, Nigeria. The sky is not the limit — it''s the road. 🚁❤️',
   '["https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800"]', '["image"]',
   6234, 2341, 0, NOW() - INTERVAL '3 hours'),

  -- === SENDSTACK ===
  (v_uid,
   'Sendstack helps 600 e-commerce businesses in Lagos ship same-day. We started in a single room in Yaba with 3 bikes. Today we are Nigeria''s #1 last-mile e-commerce courier by customer satisfaction score. Bootstrapped. Black-owned. Nigerian-built. 📦🇳🇬',
   '[]', '[]',
   1234, 498, 0, NOW() - INTERVAL '6 hours'),

  -- === CÔTE D'IVOIRE STARTUP ===
  (v_uid,
   'CinetPay vient de traiter 100 millions de transactions en Afrique de l''Ouest. Côte d''Ivoire, Sénégal, Mali, Cameroun — notre réseau s''étend. Payer localement, encaisser globalement. C''est notre promesse et nous la tenons. 🌍💳',
   '["https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800"]', '["image"]',
   1876, 623, 0, NOW() - INTERVAL '20 hours'),

  -- === RENSOURCE ===
  (v_uid,
   'Rensource has powered 4,000 Nigerian SMEs with solar energy. We don''t just sell panels — we sell uptime. Zero grid dependency. Zero generator fuel cost. 4,000 businesses that now compete on a level playing field. This is what clean energy access means. ☀️',
   '[]', '[]',
   1102, 412, 0, NOW() - INTERVAL '13 hours'),

  -- === STEARS ===
  (v_uid,
   'Stears publishes 200th African economic intelligence report. Our data is now used by the World Bank, 40 investment funds, and 3 African governments. Africa''s decisions should be informed by African data. Subscribe at stears.co 📊',
   '["https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800"]', '["image"]',
   987, 342, 0, NOW() - INTERVAL '5 days'),

  -- === FARMCROWDY ===
  (v_uid,
   'Farmcrowdy investors have now funded 120,000+ smallholder farmers in Nigeria. Average farmer income up 73% year-on-year. Average investor return: 21% annually. Agriculture is not a charity — it is the most undervalued asset class in Africa. 🌱',
   '[]', '[]',
   1456, 534, 0, NOW() - INTERVAL '1 day'),

  -- === MARKET INTELLIGENCE / IFB ===
  (v_uid,
   '📊 IFB Market Intelligence: Africa fintech funding hit $3.2B in Q1 2026 — up 41% YoY. Nigeria, Kenya, and Egypt account for 71% of deals. Median pre-seed round: $750K. Average time from application to term sheet: 67 days. Full report available in VentureX Market Intel. #IFBData',
   '[]', '[]',
   2103, 876, 0, NOW() - INTERVAL '7 hours'),

  (v_uid,
   '🏆 IFB VentureX Quarterly Leaderboard: Top 3 companies by capital deployed this quarter — Flutterwave ($12M raised), Moniepoint ($8.4M), Twiga Foods ($6.1M). Congratulations to all who closed rounds this quarter. Applications open for Q3 cohort. 🎯',
   '["https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800"]', '["image"]',
   1876, 703, 0, NOW() - INTERVAL '4 hours'),

  -- === MOTIVATIONAL / COMMUNITY ===
  (v_uid,
   'Reminder to every founder in this feed: your first 1,000 users will not come from a press release. They will come from 1,000 conversations, 1,000 DMs, and 1,000 moments where you showed up when nobody was watching. Keep building. 💪 #StartupLife #Africa',
   '[]', '[]',
   4523, 1876, 0, NOW() - INTERVAL '2 hours'),

  (v_uid,
   'The best time to start your company in Africa was 10 years ago. The second best time is right now. The infrastructure exists. The capital exists. The talent exists. The only thing missing is the founder willing to do the hard work. Are you that founder? 🔥',
   '[]', '[]',
   5102, 2341, 0, NOW() - INTERVAL '15 hours'),

  (v_uid,
   'Quick thread on how to get your first 100 B2B customers in Africa without spending on ads: 1) Identify 200 target businesses by LinkedIn and Google Maps. 2) Walk into their offices. 3) Talk to the owner not the receptionist. 4) Solve ONE problem for free. 5) Ask for referrals. That''s it. 🧵',
   '[]', '[]',
   3876, 1432, 0, NOW() - INTERVAL '1 day'),

  -- === DEAL ANNOUNCEMENTS ===
  (v_uid,
   '🤝 Deal closed: Solar company in Rwanda raises $2.5M seed from Horizon Ventures East Africa and IFB Africa Growth Fund. The company has powered 8,000 households and is expanding to Burundi. Verified on IFB VentureX. Congratulations to the founders! ⚡🌍',
   '["https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800"]', '["image"]',
   2341, 934, 0, NOW() - INTERVAL '3 hours'),

  (v_uid,
   '🎉 Series A closed: Lagos-based insurtech raises $7M led by Africa FinTech Fund. The company covers 280,000 informal sector workers with micro-insurance starting at $1/month. This is what solving real problems looks like. Verified deal on IFB VentureX. 🛡️',
   '[]', '[]',
   1876, 702, 0, NOW() - INTERVAL '9 hours'),

  (v_uid,
   'New deal on IFB VentureX: Cairo EdTech startup matches with Cairo Innovation Partners. $1.2M pre-seed. 40,000 students on platform. 94% completion rate. If you''re an investor looking at edtech in North Africa — this is the benchmark. 📚🇪🇬',
   '["https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800"]', '["image"]',
   1543, 603, 0, NOW() - INTERVAL '6 hours'),

  -- === PRODUCT LAUNCHES ===
  (v_uid,
   'We just shipped our API to production. 3 months of building. 12 engineers. 400 commits. 6,000 lines of test coverage. Our first customer went live this morning and their first transaction processed in 1.2 seconds. Shipping is a feeling unlike anything else. 🚀',
   '[]', '[]',
   3241, 1234, 0, NOW() - INTERVAL '5 hours'),

  (v_uid,
   'Version 2.0 of our mobile app is live. Biggest changes: biometric login, instant balance updates, in-app KYC in 4 minutes, and dark mode (because the people asked). 50,000 app updates in the first hour. The users have spoken. 📱✨',
   '["https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800"]', '["image"]',
   2876, 1102, 0, NOW() - INTERVAL '2 days'),

  -- === MILESTONES ===
  (v_uid,
   'First $1 million in revenue. 18 months ago this was a whiteboard sketch. Last Tuesday at 11:47pm, we crossed $1,000,000 in cumulative revenue. Small number in the grand scheme. Giant milestone for us. We cried. We laughed. We went back to work. 🥂',
   '[]', '[]',
   4521, 2103, 0, NOW() - INTERVAL '4 hours'),

  (v_uid,
   '10,000 paying customers. We got our 10,000th customer this morning — a small business owner in Mombasa named Patricia. She has been running her catering business for 11 years with no access to financing. Today she got her first business loan. That is why we built this. 🙏',
   '["https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800"]', '["image"]',
   5234, 2341, 0, NOW() - INTERVAL '11 hours'),

  -- === INVESTOR PERSPECTIVES ===
  (v_uid,
   'Lagos Angel Network portfolio update: 14 companies funded this year. 3 exits. 2 companies crossing $1M ARR. 1 Series A closed. The data is clear — African founders are creating real businesses with real revenue. Raising our Q4 fund by 40%. 💼',
   '[]', '[]',
   1234, 512, 0, NOW() - INTERVAL '6 hours'),

  (v_uid,
   'What I look for in an African startup (thread): 1. Do they understand their customer deeply? Not surveys — conversations. 2. Is there evidence of demand before a line of code was written? 3. Can the team sell? Product is secondary. Market is primary. 4. Do they understand unit economics? 🧵',
   '[]', '[]',
   3102, 1234, 0, NOW() - INTERVAL '2 days'),

  (v_uid,
   'IFB Africa Growth Fund is accepting new company applications for our flagship accelerator program. We offer $150K, 3 months intensive support, and investor introductions. Applications close June 30th. Apply at venturex.ifb.org 🌍📋',
   '["https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800"]', '["image"]',
   1876, 702, 0, NOW() - INTERVAL '1 day'),

  -- === FAILURE & LEARNING (authentic) ===
  (v_uid,
   'We shut down our payments product yesterday. 14 months. $800K burned. The problem was real but our go-to-market was wrong. We tried to sell to enterprises before proving the product with SMEs. The lesson cost us everything. We are regrouping. Sharing this because failure is data too. 📉',
   '[]', '[]',
   6234, 2876, 0, NOW() - INTERVAL '3 days'),

  (v_uid,
   'Three things I wish I knew before raising my Series A: 1. Investors fund momentum, not potential. Show MoM growth for at least 6 months. 2. Your data room will be scrutinized harder than your pitch deck. Get your cap table clean NOW. 3. Every "let''s reconnect in Q2" means no. 🎓',
   '[]', '[]',
   4521, 1876, 0, NOW() - INTERVAL '8 hours'),

  -- === HIRING / COMMUNITY ===
  (v_uid,
   'Looking for a Lead Product Designer — remote, Africa-based. Must have shipped mobile products used by 100K+ users. You''ll redesign our core merchant experience. $3,500–$5,000/month depending on experience. DM me or email careers@(link in bio). 🎨',
   '[]', '[]',
   1432, 543, 0, NOW() - INTERVAL '4 hours'),

  (v_uid,
   'IFB Community call: every Thursday at 6PM WAT / 7PM EAT. Founders share progress, ask questions, get feedback. No pitching. No investors. Just builders helping builders. Join the link in the IFB app under Community. This week''s topic: First 100 customers. 📣',
   '[]', '[]',
   2103, 876, 0, NOW() - INTERVAL '1 hour'),

  -- === EMERGING SECTORS ===
  (v_uid,
   'CleanTech in Africa is having a moment: $1.8B invested in solar, mini-grids, and clean cooking in 2025. We are seeing 3x more applications from clean energy startups than 2 years ago on VentureX. The energy transition is happening — driven by African entrepreneurs. ☀️⚡',
   '[]', '[]',
   1543, 612, 0, NOW() - INTERVAL '16 hours'),

  (v_uid,
   'AI in Africa: 127 AI startups funded in 2025 across the continent. Top subsectors: agriculture AI, healthcare diagnostics, financial fraud detection. Average funding: $2.1M. Average team size: 8. The era of African AI is starting. Who is building? 🤖🌍',
   '["https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800"]', '["image"]',
   2876, 1102, 0, NOW() - INTERVAL '5 hours'),

  (v_uid,
   'HealthTech opportunity: 900 million Africans have limited or no access to quality primary healthcare. We have 200,000 vacancies for doctors and nurses. Technology is not the whole answer — but it is a critical part of the answer. Who is building in this space? Tag them. 🏥',
   '[]', '[]',
   3201, 1342, 0, NOW() - INTERVAL '20 hours'),

  -- === NUMBERS & DATA ===
  (v_uid,
   'IFB VentureX data snapshot — June 2026: 847 active startups on platform. $420M total capital deployed this year. 23 countries represented. 94 investor profiles active. 312 deals matched. 47 deals signed. Average match-to-close: 73 days. Building momentum. 📈',
   '["https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800"]', '["image"]',
   2341, 934, 0, NOW() - INTERVAL '2 hours'),

  (v_uid,
   'The IFB Entrepreneur Fund has approved credits for 23 founders this month. Total credits deployed: $187,000. Used for: legal setup (34%), tech build (28%), marketing (22%), advisory (16%). The fund is working. Applications open for next cohort. 💰',
   '[]', '[]',
   1876, 703, 0, NOW() - INTERVAL '7 hours'),

  -- === CULTURAL / IDENTITY ===
  (v_uid,
   'We build differently here. Our users have no physical address for credit scoring. They have no tax returns. They have no formal employment. So we built alternative credit models using mobile data, transaction history, and social graph. Build for the actual user, not the idealized user. 🧠',
   '[]', '[]',
   5102, 2103, 0, NOW() - INTERVAL '13 hours'),

  (v_uid,
   'African founders are not "emerging" — we are arrived. $6B+ raised in 2025. IPOs on London and New York exchanges. Unicorns from Lagos to Nairobi to Cairo. Stop describing us as the future. We are the present. 💪🌍 #AfricanTech',
   '[]', '[]',
   7234, 3102, 0, NOW() - INTERVAL '3 days'),

  (v_uid,
   'Le prochain milliard d''utilisateurs d''internet vient d''Afrique. Nous devons construire pour eux — dans leurs langues, sur leurs réseaux, avec leur réalité économique en tête. L''Afrique n''a pas besoin d''adapter les solutions étrangères. Elle a besoin de ses propres. 🇸🇳🇨🇮🇨🇲',
   '[]', '[]',
   2341, 1023, 0, NOW() - INTERVAL '6 hours');

  RAISE NOTICE 'Social feed seeded successfully — % posts inserted',
    (SELECT COUNT(*) FROM public.social_posts WHERE author_id = v_uid);
END;
$$;
