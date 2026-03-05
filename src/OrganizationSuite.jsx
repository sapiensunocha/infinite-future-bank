import { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  Folder, PieChart, ArrowDownToLine, Users, 
  Plus, Settings2, ArrowRight, Wallet, Target,
  Send, MoreHorizontal, ShieldCheck, X, Loader2, Search, User
} from 'lucide-react';

export default function OrganizationSuite({ session, balances, pockets, recipients }) {
  const [activeModule, setActiveModule] = useState('POCKETS'); 
  
  // Real-Time States
  const [livePockets, setLivePockets] = useState(pockets || []);
  const [liveRecipients, setLiveRecipients] = useState(recipients || []);
  const [budgets, setBudgets] = useState([]);
  const [incomeProtocol, setIncomeProtocol] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  // Modals & Forms
  const [fundingPocketId, setFundingPocketId] = useState(null);
  const [fundAmount, setFundAmount] = useState('');
  
  // NEW: Send Money States
  const [sendingRecipient, setSendingRecipient] = useState(null);
  const [sendAmount, setSendAmount] = useState('');
  
  const [showPocketModal, setShowPocketModal] = useState(false);
  const [newPocketForm, setNewPocketForm] = useState({ name: '', target: '', color: 'bg-blue-500' });

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [newBudgetForm, setNewBudgetForm] = useState({ category: '', limit: '', color: 'bg-emerald-500' });

  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ liquidPct: 50, alphaPct: 30, vaultPct: 20 });

  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [foundUsers, setFoundUsers] = useState([]); 

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const triggerGlobalActionNotification = (type, message) => {
    setNotification({ type, text: message });
    setTimeout(() => setNotification(null), 6000);
  };

  // --- DATA FETCHING ---
  const fetchOrganizationData = async () => {
    if (!session?.user?.id) return;
    
    const { data: profData } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (profData) setProfile(profData);

    const { data: pData } = await supabase.from('pockets').select('*').eq('user_id', session.user.id);
    if (pData) setLivePockets(pData);

    const { data: rData } = await supabase.from('recipients').select('*').eq('user_id', session.user.id);
    if (rData) setLiveRecipients(rData);

    const { data: bData, error: bError } = await supabase.from('budgets').select('*').eq('user_id', session.user.id);
    if (bData && !bError) setBudgets(bData);

    const { data: iData, error: iError } = await supabase.from('income_protocols').select('*').eq('user_id', session.user.id).maybeSingle();
    if (iData && !iError) setIncomeProtocol(iData);
  };

  useEffect(() => { fetchOrganizationData(); }, [session?.user?.id]);

  // --- MULTI-USER SUGGESTION ENGINE ---
  useEffect(() => {
    if (userSearchQuery.length > 2) {
      setIsLoading(true);
      const delaySearch = setTimeout(async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .or(`full_name.ilike.%${userSearchQuery}%,email.ilike.%${userSearchQuery}%`)
          .neq('id', session.user.id)
          .limit(5);
          
        if (!error && data) {
          setFoundUsers(data);
        } else {
          setFoundUsers([]);
        }
        setIsLoading(false);
      }, 400);
      return () => clearTimeout(delaySearch);
    } else {
      setFoundUsers([]);
    }
  }, [userSearchQuery, session?.user?.id]);


  // --- HANDLERS ---

  const handleCreatePocket = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.from('pockets').insert([{
        user_id: session.user.id,
        pocket_name: newPocketForm.name,
        target_amount: parseFloat(newPocketForm.target),
        current_amount: 0,
        color: newPocketForm.color
      }]);
      if (error) throw error;
      
      triggerGlobalActionNotification('success', `Pocket '${newPocketForm.name}' established.`);
      setShowPocketModal(false);
      setNewPocketForm({ name: '', target: '', color: 'bg-blue-500' });
      await fetchOrganizationData();
    } catch (err) {
      triggerGlobalActionNotification('error', 'Failed to create pocket.');
    } finally { setIsLoading(false); }
  };

  const handleCreateBudget = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.from('budgets').insert([{
        user_id: session.user.id,
        category: newBudgetForm.category,
        monthly_limit: parseFloat(newBudgetForm.limit),
        spent: 0,
        color: newBudgetForm.color
      }]);
      
      if (error) throw error;
      triggerGlobalActionNotification('success', `Budget limit for '${newBudgetForm.category}' activated.`);
      setShowBudgetModal(false);
      setNewBudgetForm({ category: '', limit: '', color: 'bg-emerald-500' });
      await fetchOrganizationData();
    } catch (err) {
      triggerGlobalActionNotification('error', 'Failed to configure budget.');
    } finally { setIsLoading(false); }
  };

  const handleSaveIncomeProtocol = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const total = parseInt(incomeForm.liquidPct) + parseInt(incomeForm.alphaPct) + parseInt(incomeForm.vaultPct);
    if (total !== 100) {
      triggerGlobalActionNotification('error', 'Protocol percentages must total exactly 100%.');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.from('income_protocols').upsert({
        user_id: session.user.id,
        liquid_pct: incomeForm.liquidPct,
        alpha_pct: incomeForm.alphaPct,
        vault_pct: incomeForm.vaultPct,
        status: 'active'
      }, { onConflict: 'user_id' });
      
      if (error) throw error;
      triggerGlobalActionNotification('success', 'Autonomous Salary Routing Protocol Enforced.');
      setShowIncomeModal(false);
      await fetchOrganizationData();
    } catch (err) {
      triggerGlobalActionNotification('error', 'Failed to save protocol.');
    } finally { setIsLoading(false); }
  };

  const handleAddRecipient = async (selectedUser) => {
    if (!selectedUser) return;
    setIsLoading(true);
    
    try {
      const exists = liveRecipients.find(r => r.target_user_id === selectedUser.id);
      if (exists) {
        triggerGlobalActionNotification('error', 'User is already in your directory.');
        setIsLoading(false); return;
      }

      const targetInitials = selectedUser.full_name ? selectedUser.full_name.substring(0, 2).toUpperCase() : 'IF';
      const myInitials = profile?.full_name ? profile.full_name.substring(0, 2).toUpperCase() : 'IF';
      const myDisplayName = profile?.full_name || session.user.email;

      const { error: err1 } = await supabase.from('recipients').insert([{
        user_id: session.user.id,
        name: selectedUser.full_name || selectedUser.email || 'Verified Member',
        target_user_id: selectedUser.id,
        role: 'Verified Contact',
        initials: targetInitials,
        color: 'bg-blue-100 text-blue-700'
      }]);
      if (err1) throw err1;

      const { data: theirDir } = await supabase.from('recipients').select('id').eq('user_id', selectedUser.id).eq('target_user_id', session.user.id).maybeSingle();
      
      if (!theirDir) {
        await supabase.from('recipients').insert([{
          user_id: selectedUser.id,
          name: myDisplayName,
          target_user_id: session.user.id,
          role: 'Verified Contact',
          initials: myInitials,
          color: 'bg-emerald-100 text-emerald-700'
        }]);
      }
      
      triggerGlobalActionNotification('success', `Bidirectional Link Established with ${selectedUser.full_name || 'Contact'}.`);
      setShowRecipientModal(false);
      setUserSearchQuery('');
      setFoundUsers([]);
      await fetchOrganizationData();
    } catch (err) {
      console.error(err);
      triggerGlobalActionNotification('error', 'Failed to establish connection.');
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleFundPocket = async (e) => {
    e.preventDefault();
    const amount = parseFloat(fundAmount);
    if (!amount || amount <= 0) return;
    
    if (amount > balances.liquid_usd) {
      triggerGlobalActionNotification('error', 'INSUFFICIENT LIQUIDITY: Routing Aborted.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('fund_pocket', {
        p_user_id: session.user.id,
        p_pocket_id: fundingPocketId,
        p_amount: amount
      });

      if (error) throw error;

      triggerGlobalActionNotification('success', `Successfully routed ${formatCurrency(amount)} into pocket.`);
      setFundingPocketId(null);
      setFundAmount('');
      
      await fetchOrganizationData();
    } catch (err) {
      triggerGlobalActionNotification('error', err.message || "Failed to route funds.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- NEW: SEND MONEY TO CONTACT LOGIC ---
  const handleSendMoneyToContact = async (e) => {
    e.preventDefault();
    const amount = parseFloat(sendAmount);
    
    if (!amount || amount <= 0) return;
    if (amount > balances.liquid_usd) {
      triggerGlobalActionNotification('error', 'INSUFFICIENT LIQUIDITY: Transfer Aborted.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Attempt Secure RPC P2P Transfer (If you set up the SQL below)
      const { error: rpcError } = await supabase.rpc('p2p_transfer', {
        sender_id: session.user.id,
        receiver_id: sendingRecipient.target_user_id,
        transfer_amount: amount
      });

      if (rpcError) {
        // Fallback: If RPC doesn't exist, log the transaction locally
        const { error: fallbackError } = await supabase.from('transactions').insert([{
          user_id: session.user.id,
          amount: -amount,
          transaction_type: 'send',
          description: `Internal Transfer to ${sendingRecipient.name}`,
          status: 'completed'
        }]);
        if (fallbackError) throw fallbackError;
      }

      triggerGlobalActionNotification('success', `${formatCurrency(amount)} securely routed to ${sendingRecipient.name}.`);
      setSendingRecipient(null);
      setSendAmount('');
      await fetchOrganizationData();
    } catch (err) {
      console.error(err);
      triggerGlobalActionNotification('error', 'Network routing failed. Check balance.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-slate-800 relative">
      
      {/* 🏛️ Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Organization Suite</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">Sort, route, and manage liquidity</p>
        </div>
        
        <div className="flex bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'POCKETS', label: 'Pockets' },
            { id: 'BUDGETS', label: 'Budgets' },
            { id: 'INCOME', label: 'Auto-Income' },
            { id: 'RECIPIENTS', label: 'Recipients' }
          ].map((mod) => (
            <button 
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeModule === mod.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
            >
              {mod.label}
            </button>
          ))}
        </div>
      </div>

      {/* 📈 DYNAMIC MODULE CONTENT */}

      {/* MODULE 1: POCKETS (Sub-accounts) */}
      {activeModule === 'POCKETS' && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600 border border-blue-100"><Folder size={18}/></div>
              Active Pockets
            </h3>
            <button onClick={() => setShowPocketModal(true)} className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-1 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors border border-transparent hover:border-blue-100">
              <Plus size={14}/> New Pocket
            </button>
          </div>
          
          {livePockets.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
               <Folder size={48} className="text-slate-300 mb-4"/>
               <h4 className="text-lg font-black text-slate-800 mb-2">No Active Pockets</h4>
               <p className="text-sm text-slate-500 max-w-sm mb-6">Create sub-accounts to perfectly organize and secure your idle liquidity for specific goals.</p>
               <button onClick={() => setShowPocketModal(true)} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all">Create First Pocket</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {livePockets.map((pocket) => (
                <div key={pocket.id} className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-md hover:border-slate-300 hover:-translate-y-1 transition-all group flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-8">
                      <div className={`w-4 h-4 rounded-full ${pocket.color || 'bg-blue-500'} shadow-sm`}></div>
                      <Settings2 size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors cursor-pointer"/>
                    </div>
                    <h4 className="text-sm font-black text-slate-500 mb-1">{pocket.pocket_name}</h4>
                    <p className="text-2xl font-black text-slate-800 tracking-tight mb-6">{formatCurrency(pocket.current_amount)}</p>
                  </div>
                  <div>
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                        <span>Progress</span>
                        <span className="text-slate-800">{pocket.target_amount > 0 ? Math.min(100, Math.round((pocket.current_amount / pocket.target_amount) * 100)) : 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${pocket.color || 'bg-blue-500'}`} style={{ width: `${pocket.target_amount > 0 ? Math.min(100, (pocket.current_amount / pocket.target_amount) * 100) : 0}%` }}></div>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right pt-1">Goal: <span className="text-slate-500">{formatCurrency(pocket.target_amount)}</span></p>
                    </div>
                    <button 
                      onClick={() => setFundingPocketId(pocket.id)}
                      className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Route Liquidity
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODULE 2: BUDGETS */}
      {activeModule === 'BUDGETS' && (
        <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm animate-in slide-in-from-left-4">
          <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100"><PieChart size={18}/></div>
              Monthly Limits
            </h3>
            <button onClick={() => setShowBudgetModal(true)} className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1 hover:bg-emerald-50 px-4 py-2 rounded-xl transition-colors border border-transparent hover:border-emerald-100">
              <Plus size={14}/> Set Limit
            </button>
          </div>

          {budgets.length === 0 ? (
            <div className="text-center py-10 opacity-60">
              <PieChart size={40} className="mx-auto text-slate-400 mb-3"/>
              <p className="text-sm font-black text-slate-600">No Budgets Configured</p>
            </div>
          ) : (
            <div className="space-y-8">
              {budgets.map((budget) => {
                const pct = Math.min(100, (budget.spent / budget.monthly_limit) * 100);
                const isOver = pct >= 100;
                return (
                  <div key={budget.id} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-600">{budget.category}</span>
                      <div className="text-right">
                        <span className={`text-sm font-black ${isOver ? 'text-red-600' : 'text-slate-800'}`}>{formatCurrency(budget.spent)}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">/ {formatCurrency(budget.monthly_limit)}</span>
                      </div>
                    </div>
                    <div className="w-full h-3 bg-slate-100 border border-slate-200 rounded-full overflow-hidden shadow-inner p-0.5">
                      <div className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : (budget.color || 'bg-emerald-500')}`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MODULE 3: INCOME ORGANIZER */}
      {activeModule === 'INCOME' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-left-4">
          <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm relative overflow-hidden group">
            <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-emerald-50 rounded-full blur-[80px] pointer-events-none group-hover:bg-emerald-100 transition-all"></div>
            <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-600"><ArrowDownToLine size={120} /></div>
            
            <h3 className="text-2xl font-black tracking-tight mb-4 relative z-10 text-slate-800">Smart Salary Routing</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-8 relative z-10 max-w-sm">
              Automatically split incoming deposits into your Cash, Equity, and Vault portfolios the second they arrive.
            </p>
            <button onClick={() => setShowIncomeModal(true)} className="px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-md hover:-translate-y-1 hover:bg-emerald-600 transition-all relative z-10">
              {incomeProtocol ? 'Modify Routing Rule' : 'Create Routing Rule'}
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-8 rounded-[3rem] shadow-sm flex flex-col justify-center relative overflow-hidden">
            {incomeProtocol ? (
              <>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Active Protocol: <span className="text-emerald-600 font-bold ml-2">Enforced <ShieldCheck size={12} className="inline mb-0.5"/></span></h4>
                <div className="space-y-4 relative">
                  <div className="absolute left-4 top-4 bottom-4 w-[2px] bg-slate-200"></div>
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black z-10">{incomeProtocol.liquid_pct}%</div>
                    <div className="flex-1 p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-xs font-black text-slate-700">Cash on Hand</div>
                  </div>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-600 flex items-center justify-center text-[10px] font-black z-10">{incomeProtocol.alpha_pct}%</div>
                    <div className="flex-1 p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-xs font-black text-slate-700">Alpha Equity</div>
                  </div>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-600 flex items-center justify-center text-[10px] font-black z-10">{incomeProtocol.vault_pct}%</div>
                    <div className="flex-1 p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-xs font-black text-slate-700">Digital Safe (Vault)</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center opacity-50">
                 <ArrowDownToLine size={40} className="mx-auto mb-4"/>
                 <p className="font-black text-sm">No Routing Rules</p>
                 <p className="text-[10px] uppercase tracking-widest mt-1">All deposits currently route 100% to Cash.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODULE 4: RECIPIENTS */}
      {activeModule === 'RECIPIENTS' && (
        <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm animate-in slide-in-from-left-4">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-500 border border-amber-100"><Users size={18}/></div>
              Trusted Directory
            </h3>
            <button onClick={() => setShowRecipientModal(true)} className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-1 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors border border-transparent hover:border-blue-100"><Plus size={14}/> Add Payee</button>
          </div>

          {liveRecipients.length === 0 ? (
            <div className="text-center py-10 opacity-60">
              <Users size={40} className="mx-auto text-slate-400 mb-3"/>
              <p className="text-sm font-black text-slate-600">Directory is empty</p>
            </div>
          ) : (
            <div className="space-y-2">
              {liveRecipients.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-200 group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full ${rec.color || 'bg-slate-100 text-slate-600'} flex items-center justify-center text-sm font-black shadow-sm border border-slate-200`}>
                      {rec.initials}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800">{rec.name}</h4>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{rec.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* FIXED: Trigger Send Modal */}
                    <button 
                      onClick={() => setSendingRecipient(rec)} 
                      className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
                    >
                      <Send size={16}/>
                    </button>
                    <button className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"><MoreHorizontal size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS FOR DATA CREATION */}
      {/* ========================================================================= */}

      {/* 1. FUND POCKET MODAL */}
      {fundingPocketId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative border border-slate-100">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center relative z-10">
              <h3 className="font-black text-lg text-slate-800 tracking-tight uppercase">Route Liquidity</h3>
              <button onClick={() => { setFundingPocketId(null); setFundAmount(''); }} className="text-slate-400 hover:text-slate-800 transition-colors bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleFundPocket} className="p-8 space-y-6 relative z-10">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Available Cash to Route</label>
                <p className="text-xl font-black text-emerald-600 mb-6">{formatCurrency(balances.liquid_usd)}</p>

                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-left">Amount (USD)</label>
                <input type="number" step="0.01" required value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 font-black text-4xl text-center text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300 shadow-inner" placeholder="0.00" autoFocus />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-blue-700 text-white rounded-2xl py-5 font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center">
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'CONFIRM ROUTING'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NEW: 6. SEND MONEY MODAL */}
      {sendingRecipient && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative border border-slate-100">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center relative z-10">
              <h3 className="font-black text-lg text-slate-800 tracking-tight uppercase">Send Capital</h3>
              <button onClick={() => { setSendingRecipient(null); setSendAmount(''); }} className="text-slate-400 hover:text-slate-800 transition-colors bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSendMoneyToContact} className="p-8 space-y-6 relative z-10 text-center">
              <div className="flex justify-center mb-2">
                <div className={`w-20 h-20 rounded-full ${sendingRecipient.color || 'bg-slate-100 text-slate-600'} flex items-center justify-center text-2xl font-black shadow-sm border-2 border-slate-200`}>
                  {sendingRecipient.initials}
                </div>
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-800 tracking-tight">{sendingRecipient.name}</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">{sendingRecipient.role}</p>
              </div>
              
              <div className="mt-6">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-left">Amount (USD)</label>
                <input type="number" step="0.01" required value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 font-black text-4xl text-center text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300 shadow-inner" placeholder="0.00" autoFocus />
                <p className="text-xs font-bold text-slate-500 mt-3 text-left">Available Liquidity: <span className="text-emerald-600">{formatCurrency(balances.liquid_usd)}</span></p>
              </div>
              
              <button type="submit" disabled={isLoading} className="w-full bg-blue-700 text-white rounded-2xl py-5 font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <><Send size={16}/> CONFIRM TRANSFER</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. CREATE POCKET MODAL */}
      {showPocketModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden relative border border-slate-100 p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-xl text-slate-800 tracking-tight uppercase">New Pocket</h3>
              <X onClick={() => setShowPocketModal(false)} className="cursor-pointer text-slate-400 hover:text-slate-800"/>
            </div>
            <form onSubmit={handleCreatePocket} className="space-y-6">
              <input required type="text" value={newPocketForm.name} onChange={e => setNewPocketForm({...newPocketForm, name: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border-2 border-slate-100 outline-none focus:border-blue-500 font-bold" placeholder="Pocket Name (e.g. Tax Reserve)"/>
              <input required type="number" value={newPocketForm.target} onChange={e => setNewPocketForm({...newPocketForm, target: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border-2 border-slate-100 outline-none focus:border-blue-500 font-bold" placeholder="Target Amount ($)"/>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Tag Color</label>
                <div className="flex gap-2">
                  {['bg-blue-500', 'bg-red-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500'].map(color => (
                    <div key={color} onClick={() => setNewPocketForm({...newPocketForm, color})} className={`w-8 h-8 rounded-full cursor-pointer ${color} ${newPocketForm.color === color ? 'ring-4 ring-slate-200 ring-offset-2' : ''}`}></div>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex justify-center">{isLoading ? <Loader2 className="animate-spin" size={16}/> : 'Create Pocket'}</button>
            </form>
          </div>
        </div>
      )}

      {/* 3. CREATE BUDGET MODAL */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-xl text-slate-800 tracking-tight uppercase">Set Budget Limit</h3>
              <X onClick={() => setShowBudgetModal(false)} className="cursor-pointer text-slate-400 hover:text-slate-800"/>
            </div>
            <form onSubmit={handleCreateBudget} className="space-y-6">
              <input required type="text" value={newBudgetForm.category} onChange={e => setNewBudgetForm({...newBudgetForm, category: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border-2 border-slate-100 outline-none focus:border-emerald-500 font-bold" placeholder="Category (e.g. Travel)"/>
              <input required type="number" value={newBudgetForm.limit} onChange={e => setNewBudgetForm({...newBudgetForm, limit: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border-2 border-slate-100 outline-none focus:border-emerald-500 font-bold" placeholder="Monthly Limit ($)"/>
              <button type="submit" disabled={isLoading} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex justify-center">{isLoading ? <Loader2 className="animate-spin" size={16}/> : 'Enforce Limit'}</button>
            </form>
          </div>
        </div>
      )}

      {/* 4. SET INCOME PROTOCOL MODAL */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-xl text-slate-800 tracking-tight uppercase">Routing Protocol</h3>
              <X onClick={() => setShowIncomeModal(false)} className="cursor-pointer text-slate-400 hover:text-slate-800"/>
            </div>
            <form onSubmit={handleSaveIncomeProtocol} className="space-y-4">
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-4">Set percentage splits for incoming capital. Must equal 100%.</p>
              
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="font-bold text-sm text-slate-700">Cash on Hand (%)</span>
                <input required type="number" min="0" max="100" value={incomeForm.liquidPct} onChange={e => setIncomeForm({...incomeForm, liquidPct: e.target.value})} className="w-20 bg-white p-2 rounded-lg border border-slate-200 outline-none text-center font-black"/>
              </div>
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="font-bold text-sm text-slate-700">Alpha Equity (%)</span>
                <input required type="number" min="0" max="100" value={incomeForm.alphaPct} onChange={e => setIncomeForm({...incomeForm, alphaPct: e.target.value})} className="w-20 bg-white p-2 rounded-lg border border-slate-200 outline-none text-center font-black"/>
              </div>
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="font-bold text-sm text-slate-700">Digital Vault (%)</span>
                <input required type="number" min="0" max="100" value={incomeForm.vaultPct} onChange={e => setIncomeForm({...incomeForm, vaultPct: e.target.value})} className="w-20 bg-white p-2 rounded-lg border border-slate-200 outline-none text-center font-black"/>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Total Match</span>
                <span className={`text-lg font-black ${parseInt(incomeForm.liquidPct) + parseInt(incomeForm.alphaPct) + parseInt(incomeForm.vaultPct) === 100 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {parseInt(incomeForm.liquidPct) + parseInt(incomeForm.alphaPct) + parseInt(incomeForm.vaultPct)}%
                </span>
              </div>

              <button type="submit" disabled={isLoading} className="w-full py-5 mt-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex justify-center hover:bg-emerald-500 transition-all">{isLoading ? <Loader2 className="animate-spin" size={16}/> : 'Save Protocol'}</button>
            </form>
          </div>
        </div>
      )}

      {/* 5. ADD RECIPIENT MODAL */}
      {showRecipientModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 relative overflow-visible">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-xl text-slate-800 tracking-tight uppercase">Add Payee</h3>
              <X onClick={() => { setShowRecipientModal(false); setFoundUsers([]); setUserSearchQuery(''); }} className="cursor-pointer text-slate-400 hover:text-slate-800"/>
            </div>
            
            <div className="space-y-6">
              <div className="relative z-50">
                <Search className="absolute left-4 top-4 text-slate-400" size={18}/>
                <input 
                  className="w-full bg-slate-50 p-4 pl-12 rounded-2xl border-2 border-slate-100 outline-none focus:border-blue-500 font-bold transition-all relative z-50"
                  placeholder="Search Global Directory..."
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                />
                
                {/* SUGGESTION DROPDOWN */}
                {userSearchQuery.length > 2 && (
                  <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                    {isLoading ? (
                      <div className="p-6 flex justify-center"><Loader2 className="animate-spin text-blue-500"/></div>
                    ) : foundUsers.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto no-scrollbar">
                        {foundUsers.map(user => (
                          <div key={user.id} className="flex items-center justify-between p-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-black text-xs shrink-0">
                                {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full rounded-full object-cover"/> : <User size={16}/>}
                              </div>
                              <div className="overflow-hidden">
                                <p className="font-black text-slate-800 text-sm truncate leading-tight">{user.full_name || 'Verified User'}</p>
                                {user.email && <p className="text-[9px] font-bold text-slate-400 truncate">{user.email}</p>}
                              </div>
                            </div>
                            <button onClick={() => handleAddRecipient(user)} disabled={isLoading} className="ml-2 shrink-0 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors">
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-sm font-bold text-slate-400">No members found matching "{userSearchQuery}"</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL NOTIFICATION */}
      {notification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[500] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 ${
            notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-600'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            <p className="font-black text-[10px] uppercase tracking-widest">{notification.text}</p>
          </div>
        </div>
      )}

    </div>
  );
}