// src/components/FeedbackForm.jsx
import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Send, CheckCircle2, MessageSquare, Star, Sparkles, Loader2, X } from 'lucide-react';

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

  if (submitted) {
    return (
      <div className="bg-white p-10 rounded-[3rem] text-center space-y-6 animate-in fade-in zoom-in duration-500 shadow-2xl border border-slate-100 max-w-lg mx-auto">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Intelligence Received</h2>
        <p className="text-slate-500 font-medium tracking-tight">Your feedback has been integrated into the IFB roadmap. Together, we redefine the protocol.</p>
        <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:-translate-y-1 transition-all">Close Terminal</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-[3rem] shadow-xl overflow-hidden animate-in slide-in-from-bottom-10 duration-700">
      <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <MessageSquare size={20} className="text-blue-600" /> IFB Feedback Survey
          </h2>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Shape the Future Institutional Protocol</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
      </div>

      <form onSubmit={handleSubmit} className="p-10 space-y-10 overflow-y-auto max-h-[70vh] no-scrollbar">
        
        {/* 1. Overall Impression */}
        <div className="space-y-4">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Star size={14}/> 1. Overall Impression</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {impressions.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setFormData({ ...formData, overall_impression: opt })}
                className={`py-3 rounded-xl border-2 text-[11px] font-black uppercase transition-all ${formData.overall_impression === opt ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Features Interest */}
        <div className="space-y-4">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Sparkles size={14}/> 2. Feature Interest</label>
          <div className="space-y-2">
            {interests.map(item => (
              <label key={item} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group">
                <input
                  type="checkbox"
                  checked={formData.features_interest.includes(item)}
                  onChange={() => handleCheckboxChange(item)}
                  className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">{item}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 3 & 4. Open Text Sections */}
        {[
          { key: 'topics_focus', label: '3. Topics to Explore', placeholder: 'What should IFB focus on next?' },
          { key: 'traditional_challenges', label: '4. Traditional Banking Challenges', placeholder: 'What is your biggest frustration with banks?' },
          { key: 'requested_solutions', label: '5. Specific IFB Solutions', placeholder: 'What features do you wish we would provide?' },
          { key: 'general_feedback', label: '6. General Feedback', placeholder: 'Suggestions on approach or communication...' }
        ].map((field) => (
          <div key={field.key} className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">{field.label}</label>
            <textarea
              value={formData[field.key]}
              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-medium outline-none focus:border-blue-500 transition-all min-h-[100px] resize-none"
              placeholder={field.placeholder}
            />
          </div>
        ))}

        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Name</label>
            <input 
              type="text" 
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</label>
            <input 
              type="email" 
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <button 
          disabled={loading || !formData.overall_impression}
          className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black uppercase text-[12px] tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
          Transmit Feedback
        </button>
      </form>
    </div>
  );
}