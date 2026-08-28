import { useState, useRef, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { Send, PhoneCall, MessageSquare, X, ShieldCheck, Loader2, BrainCircuit, HeadphonesIcon, AlertCircle, ArrowRight, CheckCircle, Ticket } from 'lucide-react';

const QUICK_FAQS = [
  { label: "Withdrawal not working", text: "My withdrawal is failing. What should I do?" },
  { label: "Card shows wrong digits", text: "My card is showing only 8 digits instead of 16. How do I fix this?" },
  { label: "Accept card payments", text: "How do I accept Visa or Mastercard payments from someone who doesn't have IFB?" },
  { label: "NFC Transfer help", text: "How do I use NFC Tap & Pay to send money?" },
  { label: "Clyrix fallback locked", text: "The Clyrix fallback option looks locked. How do I enable it?" },
  { label: "Verification email", text: "I didn't receive a verification email after signing up." },
];

const FAQ_ANSWERS = {
  "withdrawal": `To complete a withdrawal:\n1. Go to Home → Withdraw Capital\n2. Enter the amount (must be within your liquid balance)\n3. Choose P2P (Community of Trust) or Global Bank\n4. Fill in your payment details\n5. Select a routing node — IFB Global Operations is always available\n\nIf you see a "processing node" error, tap the node list again. IFB Global Operations will handle your request.`,
  "card": `Your IFB Sovereign Card shows 16 digits when you tap "Reveal Details." The masked view shows only the last 4 digits for security. If you issued a card before May 2026 and still see only 8 digits, please issue a new card from Account Hub → Infinite Card → Terminate the old one → Provision a new one.`,
  "pay partner": `The Pay Partner terminal lets you test your card with our Elite Global Medical Partner. Make sure:\n• You have an active card (not frozen)\n• Clyrix Fallback is enabled in Smart Liquidity Routing\n• Your liquid balance is above $0\n\nIf it still fails, submit a ticket and we'll review your account.`,
  "clyrix": `Clyrix Fallback is a toggle in Account Hub → Infinite Card → Card tab → Smart Liquidity Routing section. Tap the toggle to enable or disable it. When enabled (green), Clyrix insurance can bridge payment shortfalls automatically. It should be ON by default.`,
  "nfc": `NFC Tap & Pay has 3 modes:\n\n• **Send to IFB user**: Enter amount → generates 6-digit code → tap phones together (Android) or share the code. The code expires in 10 minutes.\n\n• **Receive from IFB user**: Tap "Receive from IFB" → scan via NFC or type the 6-digit code.\n\n• **Get Paid by Card (NEW)**: Tap "Get Paid by Card" → enter amount → a QR code appears. Anyone (no IFB account needed) can scan it with their phone camera and pay with Visa, Mastercard, Apple Pay, or Google Pay. The money lands in your Liquid Wallet automatically. On Android, the payment link is also written to the NFC tag so the payer can just tap.\n\nNFC physical tap requires Android with NFC enabled. iOS users use the code or QR method.`,
  "accept card": `Yes! Go to Home → Tap & Pay → "Get Paid by Card":\n1. Enter the amount you want to collect\n2. A QR code is generated — anyone scans it with their phone camera\n3. They pay with Visa, Mastercard, Apple Pay, or Google Pay\n4. Money arrives in your IFB Liquid Wallet automatically\n\nNo IFB account needed for the payer. On Android, the link is also written to NFC so the payer can just tap their phone.`,
  "card payment": `To accept card payments from anyone (Visa/Mastercard/Apple Pay):\nGo to Home → Tap & Pay → Get Paid by Card → enter amount → show the QR code. The payer scans it, pays on Stripe, and the money goes into your IFB balance.`,
  "receive card": `Go to Home → Tap & Pay → "Get Paid by Card" to generate a Stripe QR for card payments. Works with Visa, Mastercard, Apple Pay, and Google Pay.`,
  "verification": `If you didn't receive a verification email:\n1. Check your spam/junk folder\n2. Try the "Forgot Password" link on the login page — this also resends a confirmation\n3. Contact IFB support and we'll manually trigger it from our system.`,
  "balance not updating": `After a card payment, Stripe confirmation takes 5–30 seconds. Pull down to refresh the Home screen. If it still hasn't updated after 2 minutes, contact support@infinitefuturebank.org with your payment reference.`,
  "afr tokens": `AFR tokens are minted automatically after every USD deposit at a 100:1 ratio (e.g., $50 = 5,000 AFR). Check your AFR balance in the Home screen or the ⬡ AFR Node panel. Allow 30 seconds after deposit for the mint to complete.`,
  "kyc": `KYC verification is required for higher transaction limits.\n\n1. Go to Account → KYC\n2. Submit your ID document and a selfie\n3. Status progresses: pending → ai_reviewing → verified\n\nIf status is "needs_more_info" — resubmit the requested documents. Full verification typically completes within a few minutes. If stuck over 24 hours, contact support.`,
  "venturex": `VentureX is IFB's startup investment feed — access it from Home → Updates tab or the left drawer.\n\nYou can browse 80+ real African startups, watch their pitch videos, see deal flow, and track funded rounds. Scroll through the feed to explore companies by sector, stage, and country.`,
};

function getAutoAnswer(text) {
  const lower = text.toLowerCase();
  if (lower.includes('withdraw') || lower.includes('processing node') || lower.includes('failed to locate')) return FAQ_ANSWERS['withdrawal'];
  if (lower.includes('card') && (lower.includes('digit') || lower.includes('8') && lower.includes('number'))) return FAQ_ANSWERS['card'];
  if (lower.includes('pay partner') || lower.includes('partner terminal') || lower.includes('hybrid swipe')) return FAQ_ANSWERS['pay partner'];
  if (lower.includes('clyrix') || lower.includes('smart liquidity')) return FAQ_ANSWERS['clyrix'];
  if ((lower.includes('accept') || lower.includes('collect') || lower.includes('receive')) && (lower.includes('visa') || lower.includes('mastercard') || lower.includes('card payment') || lower.includes('apple pay') || lower.includes('google pay'))) return FAQ_ANSWERS['accept card'];
  if (lower.includes('get paid') || lower.includes('card payment') || lower.includes('receive card')) return FAQ_ANSWERS['card payment'];
  if (lower.includes('nfc') || lower.includes('tap & pay') || lower.includes('tap and pay')) return FAQ_ANSWERS['nfc'];
  if (lower.includes('verif') || lower.includes('confirmation email')) return FAQ_ANSWERS['verification'];
  if (lower.includes('balance') && (lower.includes('not update') || lower.includes('not show') || lower.includes('missing'))) return FAQ_ANSWERS['balance not updating'];
  if (lower.includes('afr') && (lower.includes('token') || lower.includes('mint') || lower.includes('missing'))) return FAQ_ANSWERS['afr tokens'];
  if (lower.includes('kyc') || lower.includes('identity') || lower.includes('verification') && lower.includes('document')) return FAQ_ANSWERS['kyc'];
  if (lower.includes('venturex') || lower.includes('startup') || lower.includes('invest')) return FAQ_ANSWERS['venturex'];
  return null;
}

export default function Chat({ session, onClose, balances, profile }) {
  const [mode, setMode] = useState('CHOICE'); // 'CHOICE', 'CHAT', 'CALL_REQUESTED', 'TICKET_SENT'
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [ticketProblem, setTicketProblem] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const userName = profile?.full_name?.split(' ')[0] || profile?.full_name?.split('@')[0] || 'Client';
  const initialGreeting = `Welcome, ${userName}. I'm your IFB Support Assistant. I can answer questions about withdrawals, cards, NFC transfers, and more — or connect you to a human specialist.\n\nHow can I help you today?`;

  const [messages, setMessages] = useState([
    { role: 'assistant', content: initialGreeting }
  ]);

  useEffect(() => {
    if (mode === 'CHAT') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, mode]);

  // Check if user already has an open ticket
  useEffect(() => {
    const checkOpenTicket = async () => {
      try {
        const { data } = await supabase
          .from('support_tickets')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('status', 'open')
          .maybeSingle();

        if (data) {
          setActiveTicketId(data.id);
          setIsAgentMode(true);

          const { data: pastMessages } = await supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', data.id)
            .order('created_at', { ascending: true });

          if (pastMessages && pastMessages.length > 0) {
            const formatted = pastMessages.map(m => ({
              role: m.sender_type === 'user' ? 'user' : 'agent',
              content: m.message
            }));
            setMessages([
              { role: 'system', content: 'Secure connection to Live Specialist restored.' },
              ...formatted
            ]);
          } else {
            setMessages([{ role: 'system', content: 'You are connected to the IFB Support Desk. A specialist is reviewing your account.' }]);
          }
          setMode('CHAT');
        }
      } catch (err) {
        // No open tickets, normal state
      }
    };
    if (session?.user?.id) checkOpenTicket();
  }, [session?.user?.id]);

  // Real-time listener for agent replies
  useEffect(() => {
    if (!activeTicketId) return;
    const channel = supabase.channel(`ticket_${activeTicketId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `ticket_id=eq.${activeTicketId}`
      }, (payload) => {
        if (payload.new.sender_type === 'agent') {
          setMessages(prev => [...prev, { role: 'agent', content: payload.new.message }]);
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeTicketId]);

  const handleRequestCallback = async () => {
    try {
      await supabase.from('advisor_requests').insert([
        { user_id: session.user.id, request_type: 'CALLBACK' }
      ]);
    } catch (err) { /* recorded */ }
    setMode('CALL_REQUESTED');
  };

  const handleSubmitTicket = async () => {
    if (!ticketProblem.trim()) return;
    setIsSubmittingTicket(true);
    try {
      const { data, error } = await supabase.from('support_tickets').insert([{
        user_id: session.user.id,
        status: 'open',
        subject: ticketProblem.trim().substring(0, 100),
      }]).select().single();

      if (error) throw error;

      setActiveTicketId(data.id);

      await supabase.from('support_messages').insert([{
        ticket_id: data.id,
        sender_id: session.user.id,
        sender_type: 'user',
        message: ticketProblem.trim(),
      }]);

      setIsAgentMode(true);
      setMessages([
        { role: 'system', content: 'Your problem has been submitted to IFB Support.' },
        { role: 'user', content: ticketProblem.trim() },
        { role: 'system', content: 'A specialist has been notified and will reply here shortly. You can also keep chatting.' },
      ]);
      setMode('CHAT');
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Unable to submit ticket right now: ${err.message}. Please try again or contact us directly at support@infinitefuturebank.org` }]);
      setMode('CHAT');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handleTalkToSpecialist = async () => {
    setIsTyping(true);
    try {
      const { data, error } = await supabase.from('support_tickets').insert([{
        user_id: session.user.id,
        status: 'open'
      }]).select().single();

      if (error) throw error;

      setActiveTicketId(data.id);
      setIsAgentMode(true);
      setMessages(prev => [
        ...prev,
        { role: 'system', content: 'Connecting to IFB Support Desk...' },
        { role: 'system', content: 'Connected. A specialist is reviewing your account and will reply shortly.' }
      ]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Failed to connect to Live Desk. Please email support@infinitefuturebank.org directly.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (e, textOverride = null) => {
    if (e) e.preventDefault();
    const textToSend = textOverride || input;
    if (!textToSend.trim() || isTyping) return;

    const userMessage = { role: 'user', content: textToSend.trim() };
    const newChat = [...messages, userMessage];
    setMessages(newChat);
    setInput('');
    setIsTyping(true);

    // Live agent mode: send to Supabase
    if (isAgentMode && activeTicketId) {
      try {
        await supabase.from('support_messages').insert([{
          ticket_id: activeTicketId,
          sender_id: session.user.id,
          sender_type: 'user',
          message: textToSend.trim()
        }]);
      } catch (err) {
        console.error('Message send failed', err);
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // AI mode: check local FAQ answers first
    const localAnswer = getAutoAnswer(textToSend);
    if (localAnswer) {
      await new Promise(r => setTimeout(r, 600));
      setMessages(prev => [...prev, { role: 'assistant', content: localAnswer }]);
      setIsTyping(false);
      return;
    }

    // Call agent-chat with NOVA support persona
    try {
      const payloadMessages = newChat
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role === 'assistant' ? 'ai' : 'user', text: m.content }));

      const { data, error } = await supabase.functions.invoke('agent-chat', {
        body: {
          agent: {
            id: 'support',
            name: 'NOVA',
            title: 'Customer Intelligence Officer',
            mission: 'Provide instant, accurate, empathetic support for IFB clients across all banking features, cards, transfers, and platform navigation.'
          },
          messages: payloadMessages,
          balances: balances || {},
          profile: profile || {},
          task: null
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I was unable to reach the AI relay. Please try again in a moment, or email us at support@infinitefuturebank.org if this persists.`
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-10 backdrop-blur-3xl bg-black/80 animate-in fade-in duration-300">
      <div className="bg-[#0B0F19] border border-white/10 shadow-glass rounded-[3.5rem] w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-300">

        {/* Ambient Glow */}
        <div className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[80px] pointer-events-none transition-colors duration-1000 ${isAgentMode ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}></div>

        {/* Header */}
        <div className="p-6 md:p-8 border-b border-white/10 flex justify-between items-center bg-white/5 relative z-10 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-inner transition-colors ${isAgentMode ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400' : 'bg-black/50 border-white/10 text-white'}`}>
              {isAgentMode ? <HeadphonesIcon size={24} /> : <BrainCircuit size={24} className="text-blue-400" />}
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                {isAgentMode ? 'Live Support Desk' : 'IFB Support'} <ShieldCheck size={14} className="text-emerald-400"/>
              </h2>
              <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 mt-1 ${isAgentMode ? 'text-emerald-400' : 'text-blue-400'}`}>
                <span className={`w-1 h-1 rounded-full animate-pulse ${isAgentMode ? 'bg-emerald-400' : 'bg-blue-400'}`}></span>
                {isAgentMode ? 'Human Specialist Connected' : 'AI Assistant · Online'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isAgentMode && mode === 'CHAT' && (
              <button onClick={handleTalkToSpecialist} className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all">
                <AlertCircle size={14} /> Talk to Human
              </button>
            )}
            <button onClick={onClose} className="p-3 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-colors border border-transparent hover:border-white/10">
              <X size={24}/>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 relative z-10 no-scrollbar scroll-smooth">

          {/* CHOICE MODE */}
          {mode === 'CHOICE' && (
            <div className="h-full flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-white tracking-tight">How can we help?</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Choose a support channel</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-3xl">
                {/* AI Chat */}
                <button onClick={() => setMode('CHAT')} className="bg-black/40 border border-white/10 p-8 rounded-[2rem] flex flex-col items-center gap-4 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group shadow-glass">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(59,130,246,0.3)]"><MessageSquare size={28}/></div>
                  <div className="text-center">
                    <span className="text-xs font-black uppercase tracking-widest block text-white mb-1">AI Help Chat</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Instant answers</span>
                  </div>
                </button>
                {/* Submit Problem */}
                <button onClick={() => setMode('SUBMIT_TICKET')} className="bg-black/40 border border-white/10 p-8 rounded-[2rem] flex flex-col items-center gap-4 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group shadow-glass">
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(245,158,11,0.3)]"><Ticket size={28}/></div>
                  <div className="text-center">
                    <span className="text-xs font-black uppercase tracking-widest block text-white mb-1">Report a Problem</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Get remote support</span>
                  </div>
                </button>
                {/* Callback */}
                <button onClick={handleRequestCallback} className="bg-black/40 border border-white/10 p-8 rounded-[2rem] flex flex-col items-center gap-4 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group shadow-glass">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(16,185,129,0.3)]"><PhoneCall size={28}/></div>
                  <div className="text-center">
                    <span className="text-xs font-black uppercase tracking-widest block text-white mb-1">Request Callback</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Within 5 minutes</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* SUBMIT TICKET MODE */}
          {mode === 'SUBMIT_TICKET' && (
            <div className="h-full flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500 max-w-xl mx-auto w-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4"><Ticket size={32}/></div>
                <h3 className="text-xl font-black text-white">Describe Your Problem</h3>
                <p className="text-xs text-slate-400 mt-2">Our team reviews every ticket and will reply here in-app.</p>
              </div>
              <div className="w-full space-y-4">
                <textarea
                  value={ticketProblem}
                  onChange={e => setTicketProblem(e.target.value)}
                  placeholder="Describe what's not working, what you expected to happen, and your account email..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-amber-500 transition-colors resize-none h-36 font-medium"
                />
                <button
                  onClick={handleSubmitTicket}
                  disabled={!ticketProblem.trim() || isSubmittingTicket}
                  className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all"
                >
                  {isSubmittingTicket ? <><Loader2 size={16} className="animate-spin"/>Submitting...</> : <><CheckCircle size={16}/>Submit to IFB Support</>}
                </button>
                <button onClick={() => setMode('CHOICE')} className="w-full text-center text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">
                  Back
                </button>
              </div>
            </div>
          )}

          {/* CALLBACK REQUESTED */}
          {mode === 'CALL_REQUESTED' && (
            <div className="h-full flex flex-col items-center justify-center text-center animate-in zoom-in-95">
              <div className="w-24 h-24 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-[2rem] flex items-center justify-center mb-6 animate-pulse">
                <ShieldCheck size={48} />
              </div>
              <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Callback Requested</h3>
              <p className="text-sm font-medium text-slate-400 max-w-xs mx-auto leading-relaxed">An advisor will contact you on your registered line within 5 minutes.</p>
              <button onClick={() => setMode('CHOICE')} className="mt-10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Cancel</button>
            </div>
          )}

          {/* CHAT MODE */}
          {mode === 'CHAT' && (
            <div className="flex flex-col space-y-6 pb-20">
              {messages.map((msg, i) => {
                if (msg.role === 'system') {
                  return (
                    <div key={i} className="flex justify-center animate-in fade-in">
                      <span className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 text-center max-w-sm">
                        {msg.content}
                      </span>
                    </div>
                  );
                }
                const isUser = msg.role === 'user';
                const isAgent = msg.role === 'agent';
                return (
                  <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[90%] md:max-w-[75%] p-5 rounded-[2rem] text-sm font-medium leading-relaxed shadow-glass ${
                      isUser
                        ? 'bg-blue-600 text-white border border-blue-400/30 rounded-tr-none'
                        : isAgent
                          ? 'bg-emerald-950/80 border border-emerald-500/30 text-emerald-50 rounded-tl-none'
                          : 'bg-white/10 border border-white/10 text-slate-200 rounded-tl-none'
                    }`}>
                      {isAgent && <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 border-b border-emerald-500/20 pb-2">IFB Specialist</p>}
                      {msg.content.split('\n').map((line, j) => <span key={j} className="block min-h-[1rem]">{line}</span>)}
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="p-4 rounded-3xl bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-inner">
                    <Loader2 size={14} className="animate-spin text-blue-400" />
                    {isAgentMode ? 'Specialist is typing...' : 'Processing...'}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} className="h-1" />
            </div>
          )}
        </div>

        {/* Input & Quick FAQs */}
        {mode === 'CHAT' && (
          <div className="bg-white/5 border-t border-white/10 relative z-10 backdrop-blur-xl">

            {/* Quick FAQ chips — only in AI mode */}
            {!isAgentMode && !isTyping && messages.length < 4 && (
              <div className="flex overflow-x-auto gap-2 px-6 pt-4 pb-2 no-scrollbar">
                {QUICK_FAQS.map((faq, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(null, faq.text)}
                    className="whitespace-nowrap bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 hover:text-white px-4 py-2 rounded-full text-xs font-bold transition-colors"
                  >
                    {faq.label}
                  </button>
                ))}
              </div>
            )}

            {/* Mobile "Talk to Human" */}
            {!isAgentMode && (
              <div className="md:hidden px-6 pt-2 flex justify-end">
                <button onClick={handleTalkToSpecialist} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-1">
                  <HeadphonesIcon size={12}/> Connect to Specialist
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="p-4 md:p-6 flex items-center relative">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={isAgentMode ? "Type your message to the specialist..." : "Describe your issue or ask a question..."}
                className="w-full bg-black/50 border border-white/10 rounded-full py-4 md:py-5 pl-6 pr-16 md:pr-20 text-sm font-medium outline-none focus:border-blue-500 transition-all shadow-inner text-white placeholder:text-slate-500"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className={`absolute right-6 md:right-8 w-10 h-10 md:w-12 md:h-12 text-white rounded-full flex items-center justify-center transition-all disabled:opacity-50 border ${
                  isAgentMode
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] border-emerald-400/30'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] border-blue-400/30'
                }`}
              >
                <ArrowRight size={18} className="md:hidden" />
                <Send size={18} className="hidden md:block" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
