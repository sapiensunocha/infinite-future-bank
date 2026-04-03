import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { Mail, Sparkles, ChevronRight, ShieldCheck, Lock, Eye, EyeOff, Smartphone, DownloadCloud, User, RefreshCw, X, HelpCircle, FileText, Globe2, Network, ShieldAlert, Cpu, Gem, Search, HeartHandshake } from 'lucide-react';
import Dashboard from './Dashboard';
import AuthCallback from './features/onboarding/AuthCallback';
import PayInterface from './PayInterface';
import FeedbackForm from './FeedbackForm'; 
import AdminSupportDesk from './AdminSupportDesk';
import ExecutiveCrm from './ExecutiveCrm';

// ==========================================
// REUSABLE COMPONENTS
// ==========================================
const PasswordInput = ({ value, onChange, placeholder, autoFocus = false, minLength, showPassword, togglePassword }) => (
  <div className="relative group">
    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
    <input 
      type={showPassword ? "text" : "password"} 
      required 
      minLength={minLength}
      autoFocus={autoFocus}
      value={value} 
      onChange={onChange} 
      placeholder={placeholder} 
      className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl pl-14 pr-14 py-5 text-lg font-black outline-none focus:border-blue-400 focus:bg-white/80 transition-all shadow-inner hover:bg-white/60" 
    />
    <button 
      type="button"
      onClick={togglePassword}
      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
    >
      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  </div>
);

const formatCount = (num) => {
  if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
};

// ==========================================
// INFO MODAL SYSTEM
// ==========================================
const InfoModal = ({ activeModal, onClose }) => {
  const [faqs, setFaqs] = useState([]);
  const [loadingFaqs, setLoadingFaqs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (activeModal === 'help') {
      const fetchFaqs = async () => {
        setLoadingFaqs(true);
        const { data, error } = await supabase.from('help_faqs').select('*').order('created_at', { ascending: true });
        if (data && !error) setFaqs(data);
        setLoadingFaqs(false);
      };
      fetchFaqs();
    }
  }, [activeModal]);

  useEffect(() => {
    if (!activeModal) setSearchQuery("");
  }, [activeModal]);

  if (!activeModal) return null;

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const content = {
    help: {
      title: "Help & Support Center",
      icon: <HelpCircle className="text-blue-500" size={24}/>,
      body: (
        <div className="space-y-6 text-slate-600">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search for answers..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:border-blue-400 focus:bg-white transition-all shadow-inner"
            />
          </div>

          {loadingFaqs ? (
            <div className="flex justify-center items-center py-10">
              <RefreshCw className="animate-spin text-blue-500" size={32} />
            </div>
          ) : filteredFaqs.length > 0 ? (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
              {filteredFaqs.map((faq) => (
                <div key={faq.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-blue-100 transition-colors">
                  <p className="font-black text-slate-800 text-lg mb-2">{faq.question}</p>
                  <p className="leading-relaxed text-sm">{faq.answer}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-slate-500 font-bold mb-2">No matching answers found.</p>
              <p className="text-sm">Try different keywords or submit a direct request below.</p>
            </div>
          )}

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-3xl border border-blue-100 text-center mt-8 shadow-inner">
            <h4 className="font-black text-blue-900 text-lg mb-2">Can't find what you're looking for?</h4>
            <p className="text-xs mb-6 text-blue-700/80 font-medium">Submit a secure request to our advisory and technical team.</p>
            <Link to="/FeedbackForm" className="inline-block px-8 py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-blue-500/30">
              Submit Direct Request
            </Link>
          </div>
        </div>
      )
    },
    about: {
      title: "IFB Master Protocol & AFR Documentation",
      icon: <Globe2 className="text-emerald-500" size={24}/>,
      body: (
        <div className="space-y-12 text-slate-600 text-sm leading-relaxed">
          {/* Executive Summary */}
          <div className="bg-slate-900 text-white p-10 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
            <h3 className="text-2xl font-black mb-4 text-emerald-400 tracking-tight">PHASE 1: THE DIGITAL CORE</h3>
            <p className="opacity-90 text-lg font-medium leading-relaxed">
              IFB is a synthetic financial ecosystem built on AFR (Advanced Future Reserve) with a USD-equivalent simulation. It mimics a traditional bank without holding physical fiat deposits in the traditional sense.
            </p>
          </div>

          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6 flex items-center gap-3">
              <Network className="text-blue-500" size={24}/> PART 1: The Core IFB Concept
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="font-black text-slate-800 mb-2">1. User Deposits = AFR Credits</p>
                <p>When a user deposits, they are not sending real money to IFB to hold in a vault. The system credits them with AFR tokens, representing a stable USD-equivalent balance.</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="font-black text-slate-800 mb-2">2. Withdrawals = AFR Sales</p>
                <p>When users withdraw, they sell their AFR back to IFB. IFB then pays out USD from cash points, partner accounts, or liquidity pools.</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="font-black text-slate-800 mb-2">3. Transfers & Internal Growth</p>
                <p>Internal transfers, loans, or wealth growth happen entirely within the synthetic AFR system instantly.</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="font-black text-slate-800 mb-2">4. Legal Classification</p>
                <p>Deposits are legally treated as buying AFR tokens. Withdrawals are processed as service payments redeeming these tokens.</p>
              </div>
            </div>
          </section>

          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6 flex items-center gap-3">
              <ShieldAlert className="text-amber-500" size={24}/> PART 2: Risk Mitigation & Liquidity
            </h4>
            <ul className="space-y-4">
              <li className="flex gap-4 items-start"><span className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0"></span><p><strong>Liquidity Management:</strong> IFB maintains a USD reserve equal to 20–30% of circulating AFR value. Limits and staggered withdrawals are utilized during high-demand periods.</p></li>
              <li className="flex gap-4 items-start"><span className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0"></span><p><strong>Value Stability:</strong> Algorithmic mechanisms, reserve-backed stabilization, and adjustable conversion rates maintain the 1:1 USD peg.</p></li>
              <li className="flex gap-4 items-start"><span className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0"></span><p><strong>Technical Safety:</strong> The immutable blockchain ledger and backend ensure no balance updates occur without a verified transaction record.</p></li>
            </ul>
          </section>

          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6 flex items-center gap-3">
              <Globe2 className="text-indigo-500" size={24}/> PART 3: Global Scaling (Partner Model)
            </h4>
            <p className="mb-6">IFB scales globally by acting as the logic layer, while physical money movement is handled by local partners and legally represented by Local Directors.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 text-[10px] uppercase tracking-widest">
                    <th className="p-4 rounded-tl-xl font-black">Partner Type</th>
                    <th className="p-4 font-black">Daily Capacity</th>
                    <th className="p-4 rounded-tr-xl font-black">Role</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr className="border-b border-slate-100"><td className="p-4 font-bold">Banks</td><td className="p-4">$50K - $500K</td><td className="p-4 text-slate-500">Provide USD liquidity, enable large wire transfers.</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-4 font-bold">Fintech / Wallets</td><td className="p-4">$100K - $1M</td><td className="p-4 text-slate-500">Mobile payments, card txns, online deposits.</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-4 font-bold">Mobile Money</td><td className="p-4">$10K - $200K</td><td className="p-4 text-slate-500">Deposits/withdrawals in mobile-first regions.</td></tr>
                  <tr><td className="p-4 font-bold">Crypto Exchanges</td><td className="p-4">$50K - $500K</td><td className="p-4 text-slate-500">Cross-border conversion of AFR ↔ USD.</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6">PART 4 & 5: Help Blocks & The Bukavu Model</h4>
            <div className="bg-blue-50 p-6 rounded-2xl border-l-4 border-blue-500 mb-6">
              <p className="font-bold text-blue-900 mb-2">The Liquidity Bottleneck Protocol</p>
              <p className="text-blue-800/80">When a massive withdrawal is requested and local partners lack immediate cash, IFB utilizes <strong>Help Blocks</strong>. The network creates a pending obligation, and UHNW individuals/miners contribute liquidity toward fulfilling the block, earning AFR rewards in return.</p>
            </div>
            <p>In unbanked regions (The Bukavu Model), users bring cash to trusted local IFB agents. The agent verifies the physical cash safely, and IFB instantly credits the user's digital app with AFR. Money never just sits with IFB; it flows through a secure, trusted partner.</p>
          </section>

          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6 flex items-center gap-3">
              <Gem className="text-emerald-500" size={24}/> PART 6 & 7: Wealth Management & Insurance
            </h4>
            <p className="mb-4"><strong>The Wealth Floor:</strong> Every IFB member is guaranteed a minimum wealth floor in AFR. If a user suffers extreme losses, the Hedge Fund Safety Pool automatically tops up their account to prevent absolute poverty within the ecosystem.</p>
            
            <p className="mb-2"><strong>The IFB Insurance System:</strong></p>
            <ul className="list-disc pl-5 space-y-2 mb-6">
              <li><strong>Reward-Based (Free):</strong> Users automatically earn coverage by depositing AFR, participating in revenue blocks, or contributing to Help Blocks.</li>
              <li><strong>Execution:</strong> Smart contracts automatically verify claim events and trigger instant AFR payouts directly to the wallet.</li>
            </ul>
          </section>

          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6 flex items-center gap-3">
              <Cpu className="text-purple-500" size={24}/> PART 8 & 9: 10X Safer Fraud Detection & Social Impact
            </h4>
            <p className="mb-4">IFB shifts from reactive human compliance to proactive algorithmic security. AI monitoring analyzes patterns to flag unusual behavior (e.g., rapid loan requests), while network nodes validate liquidity contributions to prevent unilateral theft.</p>
            
            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
              <p className="font-bold text-purple-900 mb-2">The Social Impact Multiplier</p>
              <p className="text-purple-800/80">IFB allocates 10% of total revenue to fund social projects (roads, schools). IFB earns 3% management fees, 2% structuring fees, and 5-10% ongoing revenue share from completed infrastructure—making social good highly profitable and self-sustaining.</p>
            </div>
          </section>

          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6">PART 11: Institutional Economics</h4>
            <p className="mb-6 font-medium text-slate-700">Official Monthly Revenue Allocation (Based on 1,000 Users / $41,750 Rev)</p>
            <div className="overflow-x-auto shadow-sm rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-800 text-white text-[10px] uppercase tracking-widest">
                    <th className="p-4 font-black">Ecosystem Stream</th>
                    <th className="p-4 font-black">%</th>
                    <th className="p-4 font-black">Designation</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr className="border-b border-slate-100"><td className="p-4 font-bold text-emerald-600">Permanent Reserve</td><td className="p-4 font-black">25%</td><td className="p-4">Locked for 5 years for strategic global mega-projects.</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-4 font-bold">AFR Loans / Advances</td><td className="p-4 font-black">30%</td><td className="p-4">Reinvested directly into the lending pool for users.</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-4 font-bold">Social Projects</td><td className="p-4 font-black">10%</td><td className="p-4">Funding infrastructure, earning management fees.</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-4 font-bold">Referral Rewards</td><td className="p-4 font-black">10%</td><td className="p-4">Bonuses driving network acquisition.</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-4 font-bold">Hedge Fund Growth</td><td className="p-4 font-black">10%</td><td className="p-4">System stability and wealth floor funding.</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-4 font-bold">Insurance Coverage</td><td className="p-4 font-black">5%</td><td className="p-4">Funds free base-level coverage for active users.</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-4 font-bold text-red-500">Emergency SOS Fund</td><td className="p-4 font-black">2%</td><td className="p-4">Immediate liquidity for users facing severe crises.</td></tr>
                  <tr><td className="p-4 font-bold text-slate-400">Operations / Admin</td><td className="p-4 font-black text-slate-400">8%</td><td className="p-4 text-slate-400">Staff, platform fees, tech maintenance.</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )
    },
    insurance: {
      title: "IFB Insurance Ecosystem",
      icon: <ShieldCheck className="text-emerald-500" size={24}/>,
      body: (
        <div className="space-y-12 text-slate-600 text-sm leading-relaxed">
          {/* Executive Summary */}
          <div className="bg-slate-900 text-white p-10 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
            <h3 className="text-2xl font-black mb-4 text-emerald-400 tracking-tight">Institutional-Grade Sovereign Protection</h3>
            <p className="opacity-90 text-lg font-medium leading-relaxed">
              Traditional consumer insurance models extract significant capital from individuals—often costing the average adult $500 to $1,000+ per month across health, auto, property, and life policies. The Infinite Future Bank (IFB) disrupts this legacy extraction model by transforming insurance from a monthly financial burden into a reward-based algorithmic safety net.
            </p>
            <p className="opacity-90 text-lg font-medium leading-relaxed mt-4">
              By leveraging the IFB Sovereign Blockchain Ledger, Smart Contracts, and the collective liquidity of the IFB Hedge Fund, the platform offers comprehensive, premium-grade insurance coverage to active network citizens at a baseline cost of $0.00. This creates an absolute financial wealth floor, guaranteeing user protection while driving unprecedented platform loyalty and ecosystem retention.
            </p>
          </div>

          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6">1. The Economic Funding Engine</h4>
            <p className="mb-4">The IFB Insurance system does not rely on third-party legacy insurance underwriters. It is a self-sustaining, mathematically backed pool integrated directly into the IFB economic model.</p>
            <div className="space-y-4">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="font-black text-slate-800 mb-2">The 5% Macro-Allocation</p>
                <p>Exactly 5% of total global ecosystem revenue (generated from transaction fees, social project management fees, and AFR loan interest) is permanently diverted to fully fund the base-level insurance coverage for all active users.</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="font-black text-slate-800 mb-2">Hedge Fund Backing</p>
                <p>The IFB Hedge Fund Growth Pool continuously invests aggregated network reserves into low-risk global assets. The yields from these investments act as the ultimate liquidity backstop for any massive insurance payout events.</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="font-black text-slate-800 mb-2">The Liquidity Network</p>
                <p>In the event of a catastrophic regional claim that exceeds local hedge fund liquidity, IFB deploys Help Blocks, allowing the broader network (UHNW individuals, miners, and investors) to temporarily inject liquidity in exchange for high-yield AFR rewards.</p>
              </div>
            </div>
          </section>

          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6">2. The Coverage Matrix (Underwritten Assets)</h4>
            <p className="mb-6">Once a user is activated on the network, their profile is cryptographically underwritten for the following baseline protections (values reflect standard entry-tier limits):</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                 <p className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-1">Comprehensive Health</p>
                 <p className="text-xl font-black text-slate-800 mb-2">$500,000</p>
                 <p className="text-xs text-slate-500"><strong>Coverage:</strong> Major medical emergencies, critical care, and catastrophic health events.</p>
               </div>
               <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                 <p className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-1">Auto & Transit</p>
                 <p className="text-xl font-black text-slate-800 mb-2">$100,000</p>
                 <p className="text-xs text-slate-500"><strong>Coverage:</strong> Liability and collision equivalent for personal transit.</p>
               </div>
               <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                 <p className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-1">Property & Contents</p>
                 <p className="text-xl font-black text-slate-800 mb-2">$250,000</p>
                 <p className="text-xs text-slate-500"><strong>Coverage:</strong> Structural damage, loss of primary residence, or critical physical assets.</p>
               </div>
               <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                 <p className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-1">Term Life Coverage</p>
                 <p className="text-xl font-black text-slate-800 mb-2">$250,000</p>
                 <p className="text-xs text-slate-500"><strong>Coverage:</strong> Immediate liquidity injected into the designated beneficiaries' Vaults upon verified loss of life.</p>
               </div>
               <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                 <p className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-1">Global Travel</p>
                 <p className="text-xl font-black text-slate-800 mb-2">$50,000</p>
                 <p className="text-xs text-slate-500"><strong>Coverage:</strong> Trip interruption, emergency repatriation, and cross-border medical.</p>
               </div>
               <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                 <p className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-1">Income Protection</p>
                 <p className="text-xl font-black text-slate-800 mb-2">$5,000 / month</p>
                 <p className="text-xs text-slate-500"><strong>Coverage:</strong> Temporary fractional income replacement if the user is incapacitated and unable to generate active cash flow.</p>
               </div>
            </div>
          </section>

          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6">3. Operational Mechanics: How It Works</h4>
            <div className="space-y-8">
              <div>
                <p className="font-bold text-slate-800 mb-2 text-lg">Phase A: Application & Smart Contract Activation</p>
                <p className="mb-4">The user experience is designed to be entirely frictionless. Users do not fill out lengthy actuarial tables or undergo medical exams for baseline coverage.</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>The Trigger:</strong> The user navigates to the Insurance Hub within the DEUS interface.</li>
                  <li><strong>The Application:</strong> The user clicks "Request Network Activation."</li>
                  <li><strong>Ledger Insertion:</strong> The Supabase backend instantly inserts an application into the ifb_insurance ledger with a PENDING_LEDGER status.</li>
                  <li><strong>Mathematical Consensus:</strong> The system simulates a brief "Network Liquidity Verification." The smart contract checks the user's active status and network health.</li>
                  <li><strong>Activation:</strong> The database mathematically approves the policy, flipping the status to ACTIVE and stamping the user's profile with a verified cryptographic signature. The user's dashboard immediately reflects 100% subsidized, active coverage across all six asset classes.</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-slate-800 mb-2 text-lg">Phase B: Maintaining Eligibility (The Reward Model)</p>
                <p className="mb-4">To keep the insurance active, the user must remain an active participant in the IFB ecosystem. Coverage is maintained by:</p>
                <ul className="list-disc pl-5 space-y-2 mb-4">
                  <li>Holding a minimum AFR balance in their Digital Safe.</li>
                  <li>Participating in local revenue blocks.</li>
                  <li>Executing regular payment routing via the IFB network.</li>
                </ul>
                <p className="italic text-xs text-slate-500">(This mechanism ensures that the 5% revenue allocation funding the insurance is continuously fed by the user's own organic financial activity).</p>
              </div>
              <div>
                <p className="font-bold text-slate-800 mb-2 text-lg">Phase C: Claims & Instant Execution</p>
                <p className="mb-4">IFB replaces reactive, human-delayed claims adjusters with proactive algorithmic smart contracts.</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Claim Verification:</strong> When an event occurs, it is verified via local designated oracles (e.g., Local IFB Directors, partnered medical institutions, or digital documentation upload).</li>
                  <li><strong>Smart Contract Execution:</strong> Once the oracle verifies the data matches the claim parameters, the smart contract executes automatically.</li>
                  <li><strong>Instant Payout:</strong> The approved funds are minted or routed directly into the user's IFB Liquid Cash (USD) or AFR balance instantly. There are no paper checks or 30-day waiting periods. The user can immediately spend the funds via QR code, physical card, or external bank withdrawal.</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
             <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6">4. Scalability & Optional Upgrades</h4>
             <p className="mb-4">While the baseline coverage is mathematically subsidized for all active users, the IFB Insurance System offers highly lucrative expansion capabilities:</p>
             <ul className="list-disc pl-5 space-y-2">
               <li><strong>Paid Premium Upgrades:</strong> Users who require $5M in life insurance or $2M in property coverage can voluntarily pay monthly premiums in AFR.</li>
               <li><strong>Ecosystem Benefit:</strong> 100% of these optional paid premiums are routed directly back into the IFB Hedge Fund. This directly increases the total wealth pool of the entire network, raising the baseline "Wealth Floor" for all users.</li>
             </ul>
          </section>

          <section>
             <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6">5. Conclusion</h4>
             <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
               <p className="text-emerald-800/80 font-medium">The IFB Insurance Ecosystem is not a standalone product; it is the ultimate expression of the Infinite Banking Concept digitized on the blockchain. By transforming a $10,000/year real-world expense into a free, algorithmically guaranteed network benefit, IFB mathematically eliminates user churn. Users will secure their capital within IFB not just for the yields or the payment routing, but because leaving the ecosystem means losing their total sovereign life protection.</p>
             </div>
          </section>
        </div>
      )
    },
    trust: {
      title: "Trust & Community Framework",
      icon: <ShieldCheck className="text-blue-500" size={24}/>,
      body: (
        <div className="space-y-12 text-slate-600 text-sm leading-relaxed">
          {/* Executive Summary */}
          <div className="bg-slate-900 text-white p-10 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
            <h3 className="text-2xl font-black mb-4 text-blue-400 tracking-tight">Building the Future of Client Confidence</h3>
            <p className="opacity-90 text-lg font-medium leading-relaxed">
              Trust is the foundation of any financial institution. For IFB, trust is not just a policy; it is our operational DNA, integrated into every service, process, and interaction. Unlike traditional banks, which rely on centralized branches and slow communication, IFB leverages global partnerships, local agents, blockchain transparency, and community engagement to build trust across regions, including underserved or high-risk areas.
            </p>
          </div>

          {/* Revenue Sharing & Constant Evolution Block */}
          <div className="bg-blue-50 p-8 rounded-3xl border-l-4 border-blue-600 shadow-sm relative overflow-hidden">
             <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
               <HeartHandshake size={160} />
             </div>
             <h4 className="text-xl font-black text-blue-900 mb-3 relative z-10">Revenue Sharing & Constant Evolution</h4>
             <p className="text-blue-800/90 font-medium leading-relaxed relative z-10 mb-4">
               At IFB, we believe the wealth generated by the network belongs to the network. <strong>We give back the vast majority of our generated revenue</strong> to our users through subsidized insurance, community loans, and direct yields. 
             </p>
             <p className="text-blue-800/90 font-medium leading-relaxed relative z-10">
               More importantly, our platform is built on <strong>radical listening</strong>. We continuously evolve our features based directly on user feedback, ensuring we serve you exactly how you want to be served. When the community speaks, the IFB architecture adapts.
             </p>
          </div>

          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6">1. Operational Trust: Being Present Everywhere</h4>
            <p className="mb-4">Traditional banks establish trust through physical branches, regular hours, and direct staff interaction—a high-cost infrastructure unable to operate in conflict zones or high-risk regions. <strong>The IFB approach:</strong></p>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li><strong>Local Agent Network:</strong> IFB partners with trusted local agents and NGOs globally. Each agent acts as an on-the-ground representative, extending IFB’s presence without the overhead of a physical branch.</li>
              <li><strong>Global Vaults:</strong> Each user effectively has a personal, secure vault accessible worldwide, enabled by IFB’s digital infrastructure.</li>
              <li><strong>24/7 Operations:</strong> IFB provides continuous support. Users can deposit, withdraw, and consult at any time.</li>
            </ul>
            <p className="italic text-xs text-slate-500">Impact: Clients see IFB’s consistent availability, which establishes reliability, the first pillar of trust.</p>
          </section>

          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6">2. Transparency & Technological Trust</h4>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li><strong>AFR Blockchain:</strong> All transactions, loans, and fund movements are recorded in immutable, transparent ledgers. Users can verify funds in real time.</li>
              <li><strong>Open Reporting:</strong> Monthly dashboards provide clients and partners a clear overview of their funds, investments, and loans.</li>
              <li><strong>Decentralized Control:</strong> Even in high-risk regions, users know their money is not at the mercy of a single branch or local manager.</li>
            </ul>
          </section>

          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6">3. Ethical & Financial Trust</h4>
            <p className="mb-4">IFB offers community-driven financial products such as microloans to underserved entrepreneurs, AFR emergency funds for disaster response, and low-interest loans designed for sustainability.</p>
            <p className="mb-4">Ethical practices reinforce client confidence through clear repayment terms, fair interest rates, and assistance programs for struggling clients.</p>
            <p className="italic text-xs text-slate-500">Example: Users affected by regional crises can access emergency microfinance instantly, with transparent rules and no hidden penalties.</p>
          </section>

          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6">4. Community Engagement: Building Social Trust</h4>
            <p className="mb-4">IFB organizes local events (financial literacy workshops), global hackathons, and volunteer partnerships. Community engagement translates to peer validation. Users see IFB actively supporting people like them, and trust spreads organically.</p>
          </section>

          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6">5. Communication & Support: Operational Excellence</h4>
            <p className="mb-4">IFB emphasizes proactive, real-time communication through alerts for transactions, advisory services for clients, and 24/7 multilingual support. Clients trust IFB because they never feel abandoned.</p>
          </section>

          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6">6. Risk Management & Geopolitical Trust</h4>
            <p className="mb-4">IFB thrives where traditional banks cannot operate: conflict zones, natural disaster areas, and politically unstable regions. A digital-first, agent-supported approach ensures continuity of financial services through distributed vaults and real-time monitoring.</p>
          </section>

          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6">7. Partner Trust: B2B Relationships</h4>
            <p className="mb-4">IFB’s partnerships are built on transparent agreements, shared values (community development, ethical finance, innovation), and revenue-sharing for co-funded projects. Partners see IFB as a reliable, globally consistent institution.</p>
          </section>

          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6">8. Competitive Differentiation</h4>
            <div className="overflow-x-auto shadow-sm rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 text-[10px] uppercase tracking-widest">
                    <th className="p-4 font-black border-b border-slate-200">Dimension</th>
                    <th className="p-4 font-black border-b border-slate-200">Traditional Banks</th>
                    <th className="p-4 font-black border-b border-slate-200">IFB Advantage</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr className="border-b border-slate-100"><td className="p-4 font-bold">Branch Presence</td><td className="p-4 text-slate-500">Local, costly</td><td className="p-4 font-medium text-blue-600">Global agents, digital vaults</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-4 font-bold">Hours of Operation</td><td className="p-4 text-slate-500">Fixed</td><td className="p-4 font-medium text-blue-600">24/7 worldwide access</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-4 font-bold">Product Transparency</td><td className="p-4 text-slate-500">Limited</td><td className="p-4 font-medium text-blue-600">Blockchain-based transparency</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-4 font-bold">Community Engagement</td><td className="p-4 text-slate-500">Rare</td><td className="p-4 font-medium text-blue-600">Regular events, volunteer programs</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-4 font-bold">Crisis Resilience</td><td className="p-4 text-slate-500">Low</td><td className="p-4 font-medium text-blue-600">Fully operational in high-risk zones</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-4 font-bold">Customer Support</td><td className="p-4 text-slate-500">Often delayed</td><td className="p-4 font-medium text-blue-600">Real-time, global support</td></tr>
                  <tr><td className="p-4 font-bold">Ethical Finance</td><td className="p-4 text-slate-500">Often profit-driven</td><td className="p-4 font-medium text-blue-600">Mission-driven, inclusive products</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
             <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6">Conclusion</h4>
             <p className="mb-4">Trust at IFB is not just a feature, it’s a system. By combining technology, partnerships, ethical finance, community engagement, and operational excellence, IFB establishes unmatched confidence with clients and partners.</p>
             <ul className="list-disc pl-5 space-y-2 mb-4">
               <li>Clients feel secure in every transaction.</li>
               <li>Communities experience tangible support and empowerment.</li>
               <li>Partners know IFB is reliable, transparent, and socially responsible.</li>
             </ul>
             <p className="font-medium text-slate-800">Through this multi-dimensional trust strategy, IFB transforms the very idea of banking, making financial services accessible, ethical, resilient, and community-centered worldwide.</p>
          </section>
        </div>
      )
    },
    terms: {
      title: "Terms of Service",
      icon: <FileText className="text-slate-500" size={24}/>,
      body: (
        <div className="space-y-4 text-slate-600">
          <p>By accessing the Infinite Future Bank (IFB) ecosystem, you agree to our synthetic operational terms.</p>
          <p><strong>1. Legal Classification of Funds:</strong> Deposits into IFB are legally treated as purchasing AFR tokens/credits. IFB provides value via AFR tokens, which are backed by our Hedge Fund and system revenue. Withdrawals are processed as service payments redeeming these tokens.</p>
          <p><strong>2. Synthetic Balances:</strong> Balances are displayed in USD equivalents for user convenience but represent underlying AFR assets on the IFB blockchain.</p>
          <p><strong>3. Liability & Security:</strong> While IFB utilizes 10x Safer AI Fraud Detection and smart contracts, users are responsible for securing their Vault Keys. IFB's Emergency SOS fund and Insurance protocols are subject to network availability and smart contract verification.</p>
        </div>
      )
    },
    policies: {
      title: "Privacy & Operational Policies",
      icon: <ShieldCheck className="text-slate-500" size={24}/>,
      body: (
        <div className="space-y-4 text-slate-600">
          <p><strong>Data Sovereignty:</strong> IFB stores transaction data immutably on the AFR blockchain ledger. Personal identity data is encrypted and separated from public ledger hashes to ensure absolute financial privacy.</p>
          <p><strong>AML & KYC:</strong> IFB works with local partner networks and Local Directors to ensure compliance with international Anti-Money Laundering regulations. High-value transactions may trigger AI anomaly detection and require secondary network verification.</p>
        </div>
      )
    }
  };

  const current = content[activeModal];

  return (
    <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            {current.icon}
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">{current.title}</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          {current.body}
        </div>
      </div>
    </div>
  );
};


// ==========================================
// MAIN DEUS APP (USER FACING)
// ==========================================
function MainApp() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [session, setSession] = useState(null);
  
  const [currentView, setCurrentView] = useState('enter_email'); 
  const [emailValue, setEmailValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [nameValue, setNameValue] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApkPrompt, setShowApkPrompt] = useState(false);
  
  const [activeModal, setActiveModal] = useState(null); 
  const [networkStats, setNetworkStats] = useState({ users: 0, orgs: 0, countries: 0 });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) sessionStorage.setItem('ifb_ref_code', ref);

    const hash = window.location.hash;
    if (hash && (hash.includes('type=invite') || hash.includes('type=recovery'))) {
      setCurrentView('update_password');
    }
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_network_stats');
        if (data && !error) {
          setNetworkStats({ users: data.users || 0, orgs: data.orgs || 0, countries: data.countries || 0 });
        }
      } catch (err) { console.error("Failed to sync network stats."); }
    };
    loadStats();
  }, []);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isAndroid = /android/i.test(userAgent);
    const isNativeApp = window?.Capacitor?.isNativePlatform?.() || window?.Capacitor?.isNative;
    if (isAndroid && !isNativeApp) setShowApkPrompt(true);
  }, []);

  useEffect(() => { setShowPassword(false); }, [currentView]);

  useEffect(() => {
    let mounted = true;

    const initializeUser = async (currentSession) => {
      if (!currentSession?.user) {
        if (mounted) { 
          setSession(null); 
          setIsAppReady(true); 
        }
        return;
      }

      setSession(currentSession);

      try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).maybeSingle(); 
          
        if (profile) {
          document.documentElement.setAttribute('data-theme', profile.theme_preference || 'system');
        } else {
          const generatedName = currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'Client';
          const refCode = sessionStorage.getItem('ifb_ref_code') || null;

          await supabase.rpc('provision_new_user', {
            p_user_id: currentSession.user.id,
            p_full_name: generatedName,
            p_ref_code: refCode
          });
        }
      } catch (err) {
        console.error("Profile initialization error:", err);
      } finally {
        if (mounted) setIsAppReady(true);
      }
    };
    
    supabase.auth.getSession().then(({ data: { session } }) => { initializeUser(session); });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setCurrentView('update_password');
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') initializeUser(session);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 6000);
  };

  const handleCheckEmail = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data: userExists } = await supabase.rpc('check_user_exists', { check_email: emailValue.trim().toLowerCase() });
      if (userExists) setCurrentView('welcome_back');
      else setCurrentView('identify_yourself');
    } catch (err) { setCurrentView('welcome_back'); } finally { setIsLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: emailValue.trim().toLowerCase(), password: passwordValue });
      if (error) throw error;
    } catch (error) { showMessage(error.message, 'error'); } finally { setIsLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      sessionStorage.setItem('deus_just_registered', 'true'); 
      const { data, error } = await supabase.auth.signUp({
        email: emailValue.trim().toLowerCase(), password: passwordValue,
        options: { data: { full_name: nameValue }, emailRedirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) throw error;
      if (data?.user && !data?.session) setCurrentView('check_email');
    } catch (error) { showMessage(error.message, 'error'); } finally { setIsLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailValue.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) throw error;
      showMessage('Recovery link dispatched to your inbox.', 'success');
      setCurrentView('check_email');
    } catch (error) { showMessage(error.message, 'error'); } finally { setIsLoading(false); }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordValue });
      if (error) throw error;
      setCurrentView('dashboard'); 
      showMessage('Vault Key secured. Access granted.', 'success');
    } catch (error) { showMessage(error.message, 'error'); } finally { setIsLoading(false); }
  };

  if (!isAppReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-blue-500 mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Connecting to Network...</p>
      </div>
    );
  }

  if (session && currentView !== 'update_password') {
    return <Dashboard session={session} onSignOut={() => { supabase.auth.signOut(); setCurrentView('enter_email'); setEmailValue(''); setPasswordValue(''); }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-6 py-12 overflow-y-auto">
      
      <InfoModal activeModal={activeModal} onClose={() => setActiveModal(null)} />

      <div className="fixed top-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-blue-200/40 to-indigo-300/20 blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-tl from-emerald-200/30 to-teal-300/10 blur-3xl pointer-events-none"></div>
      
      <div className="relative z-10 w-full max-w-[480px]">
        <div className="flex flex-col items-center mb-8 cursor-pointer hover:scale-105 transition-transform" onClick={() => setCurrentView('enter_email')}>
          <div className="flex items-center gap-1">
            <span className="text-6xl font-black text-[#4285F4]">D</span>
            <span className="text-6xl font-black text-[#EA4335]">E</span>
            <span className="text-6xl font-black text-[#FBBC04]">U</span>
            <span className="text-6xl font-black text-[#34A853]">S</span>
            <Sparkles className="text-blue-500 ml-3 drop-shadow-md" size={32} />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 relative overflow-hidden">
          
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-50"></div>

          {message.text && (
            <div className={`p-4 mb-6 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center border backdrop-blur-md ${message.type === 'error' ? 'bg-red-50/80 text-red-600 border-red-200/50' : 'bg-green-50/80 text-green-600 border-green-200/50'}`}>
              {message.text}
            </div>
          )}

          {currentView === 'enter_email' && (
            <div className="animate-in fade-in duration-300 text-center">
              <h2 className="text-2xl font-black tracking-tight mb-8 text-slate-800">Access Portal</h2>
              <form onSubmit={handleCheckEmail} className="space-y-6">
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input type="email" required autoFocus value={emailValue} onChange={(e) => setEmailValue(e.target.value)} placeholder="banker@deus.com" className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl pl-14 pr-6 py-5 text-lg font-black outline-none focus:border-blue-400 focus:bg-white/80 transition-all shadow-inner hover:bg-white/60" />
                </div>
                <button type="submit" disabled={isLoading || !emailValue} className="relative w-full overflow-hidden bg-blue-600 rounded-2xl p-5 flex items-center justify-center group disabled:opacity-50 transition-all shadow-xl hover:shadow-blue-500/20 hover:-translate-y-0.5">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10 flex items-center gap-3 text-white font-black text-sm uppercase tracking-widest">
                    {isLoading ? <RefreshCw size={18} className="animate-spin" /> : 'Continue'} 
                    {!isLoading && <ChevronRight className="group-hover:translate-x-1 transition-transform" />}
                  </div>
                </button>
              </form>
            </div>
          )}

          {currentView === 'welcome_back' && (
            <div className="animate-in slide-in-from-right-4 duration-300 text-center">
              <h2 className="text-2xl font-black tracking-tight mb-2 text-slate-800">Welcome Back</h2>
              <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-8">{emailValue}</p>
              <form onSubmit={handleLogin}>
                <div className="space-y-2">
                  <PasswordInput value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} placeholder="Password" autoFocus={true} showPassword={showPassword} togglePassword={() => setShowPassword(!showPassword)} />
                  <div className="flex justify-end px-2">
                    <button type="button" onClick={() => setCurrentView('forgot_password')} className="text-[10px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest py-2">
                      Forgot Vault Key?
                    </button>
                  </div>
                </div>
                
                <button type="submit" disabled={isLoading || !passwordValue} className="relative w-full mt-4 bg-blue-600 rounded-2xl p-5 flex items-center justify-center shadow-xl hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 group overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                   <span className="relative z-10 text-white font-black text-sm uppercase tracking-widest">{isLoading ? 'Authenticating...' : 'Confirm Access'}</span>
                </button>
              </form>
              <div className="mt-8 flex flex-col gap-3">
                <button onClick={() => setCurrentView('enter_email')} className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors">Switch Account</button>
              </div>
            </div>
          )}

          {currentView === 'forgot_password' && (
            <div className="animate-in slide-in-from-left-4 duration-300 text-center">
              <h2 className="text-2xl font-black tracking-tight mb-2 text-slate-800">Vault Recovery</h2>
              <p className="text-xs font-bold text-slate-500 mb-8">Confirm your email to receive a secure reset link.</p>
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input type="email" required autoFocus value={emailValue} onChange={(e) => setEmailValue(e.target.value)} placeholder="banker@deus.com" className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl pl-14 pr-6 py-5 text-lg font-black outline-none focus:border-blue-400 focus:bg-white/80 transition-all shadow-inner hover:bg-white/60" />
                </div>
                <button type="submit" disabled={isLoading || !emailValue} className="relative w-full overflow-hidden bg-slate-900 rounded-2xl p-5 flex items-center justify-center shadow-xl hover:shadow-slate-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 group">
                  <span className="relative z-10 text-white font-black text-sm uppercase tracking-widest">{isLoading ? <RefreshCw size={18} className="animate-spin" /> : 'Dispatch Recovery Key'}</span>
                </button>
              </form>
              <div className="mt-8 flex flex-col gap-3">
                <button onClick={() => setCurrentView('welcome_back')} className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors">Return to Login</button>
              </div>
            </div>
          )}

          {currentView === 'identify_yourself' && (
            <div className="animate-in slide-in-from-right-4 duration-300 text-center">
              <h2 className="text-2xl font-black tracking-tight mb-8 text-slate-800">Identify Yourself</h2>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                  <input type="text" required autoFocus value={nameValue} onChange={(e) => setNameValue(e.target.value)} placeholder="Given Name" className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl pl-14 pr-6 py-5 text-lg font-black outline-none focus:border-emerald-400 focus:bg-white/80 transition-all shadow-inner hover:bg-white/60" />
                </div>
                <PasswordInput value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} placeholder="Set Password" minLength={6} showPassword={showPassword} togglePassword={() => setShowPassword(!showPassword)} />
                <button type="submit" disabled={isLoading || !nameValue || !passwordValue} className="relative w-full overflow-hidden bg-emerald-600 rounded-2xl p-5 flex items-center justify-center shadow-xl hover:shadow-emerald-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative z-10 text-white font-black text-sm uppercase tracking-widest">{isLoading ? 'Creating...' : 'Create Vault'}</span>
                </button>
              </form>
            </div>
          )}

          {currentView === 'check_email' && (
            <div className="animate-in slide-in-from-bottom-4 duration-300 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 animate-pulse mb-6 shadow-inner"><Mail size={40}/></div>
              <h2 className="text-2xl font-black mb-2 text-slate-800">Check Inbox</h2>
              <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-8">{emailValue}</p>
              <button onClick={() => setCurrentView('enter_email')} className="text-[10px] font-black uppercase text-slate-500 hover:text-blue-600 transition-colors">Back to Login</button>
            </div>
          )}

          {currentView === 'update_password' && (
            <div className="animate-in slide-in-from-bottom-4 duration-300 text-center">
              <h2 className="text-2xl font-black mb-8 text-slate-800">New Vault Key</h2>
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <PasswordInput value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} placeholder="New Password" autoFocus={true} minLength={6} showPassword={showPassword} togglePassword={() => setShowPassword(!showPassword)} />
                <button type="submit" disabled={isLoading || !passwordValue} className="relative w-full bg-blue-600 rounded-2xl p-5 shadow-xl hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative z-10 text-white font-black text-sm uppercase tracking-widest">Save Password</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* CLEAN, UNIFIED FOOTER WITH NEW TRUST LINK */}
        <div className="mt-8 text-center text-[11px] font-medium text-slate-500 px-4 animate-in fade-in duration-700 delay-100 leading-relaxed">
          Trusted by <span className="font-bold text-slate-700">{formatCount(networkStats.users)}</span> customers and <span className="font-bold text-slate-700">{formatCount(networkStats.orgs)}</span> organizations in <span className="font-bold text-slate-700">{formatCount(networkStats.countries)}</span> countries. Regulated by US and Canadian governments. Discover how <span onClick={() => setActiveModal('about')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">IFB works</span>, the <span onClick={() => setActiveModal('about')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">AFR in its brain</span>, our <span onClick={() => setActiveModal('insurance')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">Insurance Protocol</span>, and explore our core <span onClick={() => setActiveModal('trust')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">Trust Framework</span>. Read our <span onClick={() => setActiveModal('policies')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">Policies</span> & <span onClick={() => setActiveModal('terms')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">Terms of Service</span>. Need assistance or want to share feedback so we can serve you better? <span onClick={() => setActiveModal('help')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">Get Help & FAQ</span>.
        </div>

        {showApkPrompt && (
          <div className="mt-6 animate-in slide-in-from-bottom-8 duration-500 delay-200">
            <a href="https://drive.google.com/file/d/1hMZPScVf1uak-BiL312HEXLwYo9DZPC1/view?usp=drive_link" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-slate-900/80 backdrop-blur-2xl border border-slate-700/50 p-4 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-[1.02] transition-transform group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800/80 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:text-emerald-300 transition-colors shadow-inner border border-slate-700/50"><Smartphone size={24} /></div>
                <div className="text-left">
                  <p className="text-white font-black text-sm tracking-wide leading-none mb-1">Native Android App</p>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">Optimized & Secure</p>
                </div>
              </div>
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all border border-emerald-500/30"><DownloadCloud size={18} /></div>
            </a>
          </div>
        )}

      </div>
    </div>
  );
}

// ==========================================
// ADMIN GATEWAY COMPONENT (Support Desk)
// ==========================================
function AdminGateway() {
  const [session, setSession] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) { window.location.href = '/'; return; }
      setSession(currentSession);
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).single();
      if (profile && ['support_l1', 'advisor_l2', 'admin_l3'].includes(profile.role)) {
        setAdminProfile(profile);
      }
      setLoading(false);
    };
    checkAdminStatus();
  }, []);

  if (loading) return <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center"><RefreshCw className="animate-spin text-blue-500" size={32} /></div>;
  
  if (!adminProfile) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center text-white">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-black uppercase tracking-widest">Access Denied</h2>
        <p className="text-slate-400 mt-2">You lack the necessary clearance for the Command Center.</p>
        <Link to="/" className="mt-8 px-6 py-3 bg-blue-600 rounded-xl font-bold text-sm">Return to Dashboard</Link>
      </div>
    );
  }
  return <AdminSupportDesk session={session} adminProfile={adminProfile} />;
}

// ==========================================
// 🔥 NEW: HQ EXECUTIVE GATEWAY (The CRM)
// ==========================================
function HqGateway() {
  const [session, setSession] = useState(null);
  const [isHqAdmin, setIsHqAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHqStatus = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) { window.location.href = '/'; return; }
      setSession(currentSession);
      
      // Strict check: Only Level 3 Admins (Founders/Execs) can access the HQ CRM
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).single();
      if (profile && profile.role === 'admin_l3') {
        setIsHqAdmin(true);
      }
      setLoading(false);
    };
    checkHqStatus();
  }, []);

  if (loading) return <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center"><RefreshCw className="animate-spin text-blue-500" size={32} /></div>;
  
  if (!isHqAdmin) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center text-white">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-black uppercase tracking-widest">Clearance Level Insufficient</h2>
        <p className="text-slate-400 mt-2">This sector is restricted to Level 3 Command Executives.</p>
        <Link to="/" className="mt-8 px-6 py-3 bg-blue-600 rounded-xl font-bold text-sm hover:bg-blue-500 transition-colors">Eject</Link>
      </div>
    );
  }
  return <ExecutiveCrm session={session} />;
}

// ==========================================
// MAIN ROUTER
// ==========================================
export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); });
    return () => authListener.subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/pay" element={<PayInterface />} />
        
        {/* SECURE ROUTES */}
        <Route path="/admin" element={<AdminGateway />} />
        <Route path="/hq" element={<HqGateway />} />
        
        <Route 
          path="/FeedbackForm" 
          element={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
              <FeedbackForm session={session} onClose={() => window.location.href = '/'} />
            </div>
          } 
        />
      </Routes>
    </Router>
  );
}