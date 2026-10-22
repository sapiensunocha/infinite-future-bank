import { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { Users, Plus, Search, MapPin, Building, Briefcase, Calendar, Target, Flame, ChevronRight, X, Save, MessageSquare, Phone, Mail } from 'lucide-react';

export default function ExecutiveCrm({ session }) {
  const [contacts, setContacts] = useState([]);
  const [view, setView] = useState('LIST'); // 'LIST' or 'INTAKE'
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '', company: '', job_title: '', sector: '', country: '', 
    email: '', phone: '', met_at_event: '', location: '', 
    category: 'Investor', seriousness: 'Curious', priority: 'Warm', status: 'Lead',
    biggest_interest: '', interaction_notes: '', next_follow_up: ''
  });

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from('ifb_executive_crm')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    
    if (data) setContacts(data);
  };

  useEffect(() => { fetchContacts(); }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('ifb_executive_crm').insert([{
        ...formData,
        user_id: session.user.id
      }]);
      if (error) throw error;
      
      // Reset and go back to list
      setFormData({
        full_name: '', company: '', job_title: '', sector: '', country: '', 
        email: '', phone: '', met_at_event: '', location: '', 
        category: 'Investor', seriousness: 'Curious', priority: 'Warm', status: 'Lead',
        biggest_interest: '', interaction_notes: '', next_follow_up: ''
      });
      await fetchContacts();
      setView('LIST');
    } catch (err) {
      console.error("Error saving contact:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.met_at_event?.toLowerCase().includes(search.toLowerCase())
  );

  if (view === 'INTAKE') {
    return (
      <div className="animate-in slide-in-from-bottom-4 duration-300 pb-20">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Target className="text-blue-600"/> Strategic Intake
            </h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Log New Connection</p>
          </div>
          <button onClick={() => setView('LIST')} className="p-2 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors">
            <X size={20} className="text-slate-600"/>
          </button>
        </div>

        <form onSubmit={handleSaveContact} className="space-y-8">
          {/* SECTION 1: IDENTITY */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-100 pb-2">1. Identity & Origin</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required name="full_name" value={formData.full_name} onChange={handleInputChange} placeholder="Full Name" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
              <input name="company" value={formData.company} onChange={handleInputChange} placeholder="Company / Fund" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
              <input name="job_title" value={formData.job_title} onChange={handleInputChange} placeholder="Job Title" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
              <input name="sector" value={formData.sector} onChange={handleInputChange} placeholder="Sector (e.g., Web3, Real Estate)" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <input name="met_at_event" value={formData.met_at_event} onChange={handleInputChange} placeholder="Met At (e.g., Davos 2026)" className="w-full bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500 placeholder:text-blue-300" />
              <input name="location" value={formData.location} onChange={handleInputChange} placeholder="City / Country" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
              <input type="date" name="next_follow_up" value={formData.next_follow_up} onChange={handleInputChange} className="w-full bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-sm font-bold text-emerald-800 outline-none focus:border-emerald-500" title="Next Follow Up Date" />
            </div>
          </div>

          {/* SECTION 2: THE STRATEGIC QUESTIONS */}
          <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl space-y-6 text-white">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-800 pb-2 flex items-center gap-2">
              <Flame size={14} className="text-amber-500"/> 2. The Execution Blueprint
            </h3>
            
            <div>
              <label className="block text-xs font-bold text-blue-400 mb-2">Q: "What is the biggest bottleneck in your current capital flow?"</label>
              <textarea name="interaction_notes" value={formData.interaction_notes} onChange={handleInputChange} placeholder="Record their pain points and general notes here..." className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl text-sm font-medium outline-none focus:border-blue-500 min-h-[100px] text-slate-200 placeholder:text-slate-500 custom-scrollbar"></textarea>
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-400 mb-2">Q: "What specific IFB module solves your problem?"</label>
              <input name="biggest_interest" value={formData.biggest_interest} onChange={handleInputChange} placeholder="e.g., Institutional Yields, The Bukavu Model, Cross-Border Settlement..." className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 text-slate-200 placeholder:text-slate-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Intent Level</label>
                <select name="seriousness" value={formData.seriousness} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl text-sm font-bold outline-none focus:border-amber-500 text-white">
                  <option value="Tire Kicker">Tire Kicker</option>
                  <option value="Curious">Curious</option>
                  <option value="Highly Engaged">Highly Engaged</option>
                  <option value="Ready to Deploy">Ready to Deploy</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Category</label>
                <select name="category" value={formData.category} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500 text-white">
                  <option value="Investor">Investor</option>
                  <option value="Tech Partner">Tech Partner</option>
                  <option value="Regulator">Regulator</option>
                  <option value="VIP Client">VIP Client</option>
                  <option value="Media/PR">Media / PR</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Priority</label>
                <select name="priority" value={formData.priority} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl text-sm font-bold outline-none focus:border-red-500 text-white">
                  <option value="Hot">Hot (Close Now)</option>
                  <option value="Warm">Warm (Nurture)</option>
                  <option value="Cold">Cold (Archive)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: CONTACT INFO */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-100 pb-2">3. Routing Details</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email Address" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
              <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Phone / WhatsApp" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
             </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-blue-500 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
            {isSubmitting ? 'Securing Ledger...' : <><Save size={20}/> Save Strategic Contact</>}
          </button>
        </form>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="text-blue-600"/> Network CRM
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Manage deal-flow, investors, and strategic partnerships.</p>
        </div>
        <div className="flex w-full md:w-auto items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input 
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Rolodex..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 pl-12 pr-4 text-sm font-bold outline-none focus:border-blue-500"
            />
          </div>
          <button onClick={() => setView('INTAKE')} className="bg-slate-900 text-white p-3.5 rounded-full shadow-lg hover:bg-slate-800 transition-transform hover:scale-105 active:scale-95">
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* CRM List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.map(contact => (
          <div key={contact.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-black text-slate-800 text-lg leading-tight">{contact.full_name}</h3>
                <p className="text-xs font-bold text-blue-600 mt-1">{contact.job_title} {contact.company && `at ${contact.company}`}</p>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                contact.priority === 'Hot' ? 'bg-red-50 text-red-600 border border-red-100' : 
                contact.priority === 'Warm' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                'bg-slate-100 text-slate-500 border border-slate-200'
              }`}>
                {contact.priority}
              </span>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <MapPin size={14} className="text-slate-400"/> {contact.location || contact.country || 'Location Unknown'}
              </div>
              {contact.met_at_event && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Calendar size={14} className="text-slate-400"/> Met at {contact.met_at_event}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Target size={14} className="text-emerald-500"/> Interest: <span className="font-bold text-slate-800 truncate">{contact.biggest_interest || 'General'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Flame size={14} className={contact.seriousness === 'Ready to Deploy' ? 'text-red-500' : 'text-amber-500'}/> Intent: <span className="font-bold">{contact.seriousness}</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
               <div className="flex gap-2">
                 {contact.email && <a href={`mailto:${contact.email}`} className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors"><Mail size={14}/></a>}
                 {contact.phone && <a href={`tel:${contact.phone}`} className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-colors"><Phone size={14}/></a>}
               </div>
               {contact.next_follow_up && (
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
                   Follow Up: {new Date(contact.next_follow_up).toLocaleDateString()}
                 </span>
               )}
            </div>
          </div>
        ))}

        {filteredContacts.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white border border-slate-200 rounded-3xl border-dashed">
            <Users size={48} className="mx-auto text-slate-300 mb-4"/>
            <h3 className="text-lg font-black text-slate-700">Network is Empty</h3>
            <p className="text-sm text-slate-500 mb-6">Start building your institutional Rolodex.</p>
            <button onClick={() => setView('INTAKE')} className="px-6 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-blue-500 transition-colors shadow-lg">
              Log First Connection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}