import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { Mail, Sparkles, ChevronRight, ShieldCheck, Lock, Eye, EyeOff, Smartphone, DownloadCloud, User, RefreshCw, X, HelpCircle, FileText, Globe2, Network, ShieldAlert, Cpu, Gem } from 'lucide-react';
import Dashboard from './Dashboard';
import AuthCallback from './features/onboarding/AuthCallback';
import PayInterface from './PayInterface';
import FeedbackForm from './FeedbackForm'; 

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
// INFO MODAL SYSTEM (Whitepaper, Help, Legal)
// ==========================================
const InfoModal = ({ activeModal, onClose }) => {
  const [faqs, setFaqs] = useState([]);
  const [loadingFaqs, setLoadingFaqs] = useState(false);

  // Dynamically fetch FAQs from Supabase when Help modal opens
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

  if (!activeModal) return null;

  const content = {
    help: {
      title: "Help & Advisory",
      icon: <HelpCircle className="text-blue-500" size={24}/>,
      body: (
        <div className="space-y-6 text-slate-600">
          {loadingFaqs ? (
            <div className="flex justify-center items-center py-10">
              <RefreshCw className="animate-spin text-blue-500" size={32} />
            </div>
          ) : faqs.length > 0 ? (
            faqs.map((faq) => (
              <div key={faq.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="font-black text-slate-800 text-lg mb-2">{faq.question}</p>
                <p className="leading-relaxed">{faq.answer}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-slate-500 py-10">No FAQs available yet.</p>
          )}

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-3xl border border-blue-100 text-center mt-8 shadow-inner">
            <h4 className="font-black text-blue-900 text-xl mb-2">Have a unique inquiry?</h4>
            <p className="text-sm mb-6 text-blue-700/80 font-medium">Submit a secure request to our advisory and technical team.</p>
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

          

          {/* PART 1 */}
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

          {/* PART 2 */}
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

          

          {/* PART 3: SCALING */}
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

          {/* PART 4 & 5 */}
          <section>
            <h4 className="font-black text-slate-800 text-xl tracking-tight border-b-2 border-slate-100 pb-3 mb-6">PART 4 & 5: Help Blocks & The Bukavu Model</h4>
            <div className="bg-blue-50 p-6 rounded-2xl border-l-4 border-blue-500 mb-6">
              <p className="font-bold text-blue-900 mb-2">The Liquidity Bottleneck Protocol</p>
              <p className="text-blue-800/80">When a massive withdrawal is requested and local partners lack immediate cash, IFB utilizes <strong>Help Blocks</strong>. The network creates a pending obligation, and UHNW individuals/miners contribute liquidity toward fulfilling the block, earning AFR rewards in return.</p>
            </div>
            <p>In unbanked regions (The Bukavu Model), users bring cash to trusted local IFB agents. The agent verifies the physical cash safely, and IFB instantly credits the user's digital app with AFR. Money never just sits with IFB; it flows through a secure, trusted partner.</p>
          </section>

          {/* PART 6 & 7: Wealth & Insurance */}
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

          

          {/* PART 8 & 9: Fraud & Social */}
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

          {/* PART 11: REVENUE ALLOCATION TABLE */}
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
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            {current.icon}
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">{current.title}</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          {current.body}
        </div>
      </div>
    </div>
  );
};


// ==========================================
// MAIN DEUS APP
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
        if (mounted) { setSession(null); setIsAppReady(true); }
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

          const { error: provisionError } = await supabase.rpc('provision_new_user', {
            p_user_id: currentSession.user.id,
            p_full_name: generatedName,
            p_ref_code: refCode
          });

          if (provisionError) throw provisionError;

          if (!sessionStorage.getItem('deus_just_registered')) setCurrentView('update_password');
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

        <div className="mt-8 text-center text-xs font-medium text-slate-500/80 px-4 animate-in fade-in duration-700 delay-100 leading-relaxed">
          Trusted by <span className="font-black text-slate-700">{formatCount(networkStats.users)}</span> customers and <span onClick={() => setActiveModal('about')} className="font-black text-slate-700 underline cursor-pointer hover:text-blue-600 transition-colors">{formatCount(networkStats.orgs)} organizations</span> in <span onClick={() => setActiveModal('about')} className="font-black text-slate-700 underline cursor-pointer hover:text-blue-600 transition-colors">{formatCount(networkStats.countries)} countries</span>.<br/>
          <span className="flex items-center justify-center gap-1.5 mt-2">
            <ShieldCheck size={14} className="text-emerald-500" /> 
            Regulated by US and Canadian governments.
          </span>
          
          <div className="mt-6 text-[10px] uppercase tracking-widest leading-relaxed bg-white/40 p-4 rounded-2xl backdrop-blur-sm border border-white/50 shadow-sm">
            Discover how <button onClick={() => setActiveModal('about')} className="font-black text-blue-600 underline hover:text-blue-800 transition-colors">IFB works</button> and the <button onClick={() => setActiveModal('about')} className="font-black text-emerald-600 underline hover:text-emerald-800 transition-colors">AFR protocol</button>.<br/><br/>
            Read our <button onClick={() => setActiveModal('policies')} className="font-bold hover:text-slate-800 underline transition-colors">Policies</button> & <button onClick={() => setActiveModal('terms')} className="font-bold hover:text-slate-800 underline transition-colors">Terms of Service</button>. <br/>
            Need assistance? <button onClick={() => setActiveModal('help')} className="font-black text-blue-500 hover:text-blue-700 underline mt-1 transition-colors">Get Help & FAQ</button>
          </div>
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

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/pay" element={<PayInterface />} />
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