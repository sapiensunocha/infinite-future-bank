import { useState } from 'react';
import { supabase } from './services/supabaseClient';
import { Send, CheckCircle2, Star, Sparkles, Loader2, X, MessageSquare } from 'lucide-react';

export default function FeedbackForm({ session, onClose }) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    overall_impression: '',
    features_interest: [],
    topics_focus: '',
    traditional_challenges: '',
    requested_solutions: '',
    general_feedback: '',
    contact_name: session?.user?.user_metadata?.full_name || '',
    contact_email: session?.user?.email || ''
  });

  const impressions = ['Excellent', 'Good', 'Neutral', 'Poor'];
  const interests = [
    'Innovative banking solutions',
    'Investment opportunities',
    'Personalized financial guidance',
    'Transparent transactions'
  ];

  const handleCheckboxChange = (feature) => {
    setFormData(prev => ({
      ...prev,
      features_interest: prev.features_interest.includes(feature)
        ? prev.features_interest.filter(f => f !== feature)
        : [...prev.features_interest, feature]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('ifb_feedback_surveys')
        .insert([{
          user_id: session?.user?.id,
          ...formData
        }]);

      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error('Error saving feedback:', err);
      alert('Protocol error: Could not submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // SUCCESS STATE (Premium Glassmorphism)
  if (submitted) {
    return (
      <div className="relative z-10 w-full max-w-lg mx-auto animate-in fade-in zoom-in duration-500 text-slate-800">
        <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-12 text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80"></div>
          
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
            <CheckCircle2 size={48} strokeWidth={2.5} />
          </div>
          
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Intelligence Received</h2>
            <p className="text-slate-500 font-medium tracking-tight leading-relaxed">Your feedback has been securely integrated into the IFB roadmap. Together, we redefine the protocol.</p>
          </div>
          
          <button onClick={onClose} className="relative w-full overflow-hidden bg-slate-900 rounded-2xl p-5 flex items-center justify-center shadow-xl hover:shadow-slate-500/20 hover:-translate-y-0.5 transition-all group mt-8">
            <span className="relative z-10 text-white font-black text-[11px] uppercase tracking-[0.2em]">Close Terminal</span>
          </button>
        </div>
      </div>
    );
  }

  // MAIN FORM UI
  return (
    <div className="relative w-full max-w-2xl mx-auto py-10 text-slate-800">
      
      {/* Ambient Background Glows */}
      <div className="fixed top-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-blue-200/40 to-indigo-300/20 blur-3xl pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-tl from-emerald-200/30 to-teal-300/10 blur-3xl pointer-events-none z-0"></div>

      <div className="relative z-10 w-full animate-in slide-in-from-bottom-10 duration-700">
        
        {/* DEUS Logo Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center gap-1 cursor-pointer hover:scale-105 transition-transform" onClick={onClose}>
            <span className="text-5xl font-black text-[#4285F4] tracking-tighter">D</span>
            <span className="text-5xl font-black text-[#EA4335] tracking-tighter">E</span>
            <span className="text-5xl font-black text-[#FBBC04] tracking-tighter">U</span>
            <span className="text-5xl font-black text-[#34A853] tracking-tighter">S</span>
            <Sparkles className="text-blue-500 ml-2 drop-shadow-md" size={28} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2 flex items-center gap-2">
            <MessageSquare size={12} /> Institutional Feedback Protocol
          </p>
        </div>

        {/* Main Glass Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80"></div>
          
          {/* Close Button */}
          <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-white/50 hover:bg-white rounded-full transition-colors shadow-sm border border-white/60 z-20">
            <X size={18} className="text-slate-500" />
          </button>

          <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-12 overflow-y-auto max-h-[75vh] no-scrollbar">
            
            {/* 1. Overall Impression */}
            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
                <Star size={14} className="text-blue-500"/> 1. Overall Impression
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {impressions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData({ ...formData, overall_impression: opt })}
                    className={`py-4 rounded-2xl border text-[11px] font-black uppercase tracking-wider transition-all backdrop-blur-md shadow-sm ${
                      formData.overall_impression === opt 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-blue-500/20 shadow-lg scale-[1.02]' 
                        : 'bg-white/50 border-white/60 text-slate-500 hover:bg-white/80 hover:border-blue-200 hover:text-blue-600'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Features Interest */}
            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
                <Sparkles size={14} className="text-emerald-500"/> 2. Feature Interest
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {interests.map(item => {
                  const isChecked = formData.features_interest.includes(item);
                  return (
                    <label key={item} className={`flex items-center gap-4 p-5 rounded-2xl border cursor-pointer transition-all backdrop-blur-md shadow-sm ${
                      isChecked 
                        ? 'bg-emerald-50/80 border-emerald-200 shadow-emerald-500/10' 
                        : 'bg-white/50 border-white/60 hover:bg-white/80'
                    }`}>
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                        isChecked ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'
                      }`}>
                        {isChecked && <CheckCircle2 size={14} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className={`text-sm font-bold transition-colors ${isChecked ? 'text-emerald-900' : 'text-slate-600'}`}>
                        {item}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

            {/* 3 & 4. Open Text Sections */}
            <div className="space-y-8">
              {[
                { key: 'topics_focus', label: '3. Topics to Explore', placeholder: 'What should IFB focus on next?' },
                { key: 'traditional_challenges', label: '4. Traditional Banking Challenges', placeholder: 'What is your biggest frustration with traditional banks?' },
                { key: 'requested_solutions', label: '5. Specific IFB Solutions', placeholder: 'What exact features do you wish we would provide?' },
                { key: 'general_feedback', label: '6. General Feedback', placeholder: 'Any suggestions on our approach, design, or communication...' }
              ].map((field) => (
                <div key={field.key} className="space-y-3 group">
                  <label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    {field.label}
                  </label>
                  <textarea
                    value={formData[field.key]}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl p-6 text-sm font-bold text-slate-800 outline-none focus:border-blue-400 focus:bg-white/80 transition-all shadow-inner hover:bg-white/60 min-h-[120px] resize-none"
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 group">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-focus-within:text-blue-500 transition-colors">Confirm Name</label>
                <input 
                  type="text" 
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl p-5 text-sm font-bold text-slate-800 outline-none focus:border-blue-400 focus:bg-white/80 transition-all shadow-inner hover:bg-white/60"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-3 group">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-focus-within:text-blue-500 transition-colors">Confirm Email</label>
                <input 
                  type="email" 
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl p-5 text-sm font-bold text-slate-800 outline-none focus:border-blue-400 focus:bg-white/80 transition-all shadow-inner hover:bg-white/60"
                  placeholder="banker@deus.com"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button 
                type="submit"
                disabled={loading || !formData.overall_impression}
                className="relative w-full overflow-hidden bg-blue-600 rounded-2xl p-6 flex items-center justify-center group disabled:opacity-50 transition-all shadow-xl hover:shadow-blue-500/20 hover:-translate-y-0.5"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 flex items-center gap-3 text-white font-black text-[12px] uppercase tracking-[0.2em]">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  {loading ? 'Transmitting...' : 'Transmit Intelligence'}
                </div>
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}