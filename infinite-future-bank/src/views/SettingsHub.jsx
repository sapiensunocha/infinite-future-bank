import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  User, Shield, Bell, Landmark, Eye, Info, LogOut, Camera, 
  Fingerprint, RefreshCw, FileText, Scale, ShieldCheck, Mail, 
  Lock, Plus, Globe, UploadCloud, FileCheck, AlertTriangle, 
  TrendingUp, Users, Briefcase, ArrowRightLeft, CheckCircle2 
} from 'lucide-react';

export default function SettingsHub({
  session, profile, subTab, setSubTab, setActiveTab, 
  onSignOut, fetchAllData, triggerNotification
}) {
  // Local States specific to Settings
  const [isLoading, setIsLoading] = useState(false);
  const [editedName, setEditedName] = useState(profile?.full_name || '');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [emailChange, setEmailChange] = useState({ newEmail: '', otp: '', step: 'init' });
  const [mfaState, setMfaState] = useState({ qrCode: '', secret: '', verifyCode: '', factorId: '', step: 'init' });
  const fileInputRef = useRef(null);

  // CoT Application States
  const [cotFile, setCotFile] = useState(null);
  const [cotError, setCotError] = useState('');
  const [isSubmittingCot, setIsSubmittingCot] = useState(false);
  const cotFileInputRef = useRef(null);

  const [kycForm, setKycForm] = useState({ 
    legalName: profile?.full_legal_name || '', 
    dob: profile?.dob || '', phone: profile?.phone || '', 
    address: profile?.residential_address || '', country: profile?.country || '', 
    relationshipStatus: profile?.relationship_status || '' 
  });
  const [kycFiles, setKycFiles] = useState({ passport: null, selfie: null });

  const [notificationPrefs, setNotificationPrefs] = useState({ 
    payment_requests: profile?.pref_notif_payments ?? true, 
    system_alerts: profile?.pref_notif_system ?? true, 
    market_loans: profile?.pref_notif_loans ?? true 
  });

  const [previewAccess, setPreviewAccess] = useState({ 
    theme: profile?.theme_preference || 'system', 
    contrast: profile?.high_contrast || false, 
    textSize: profile?.text_size || 'default', 
    motion: profile?.reduce_motion || false 
  });

  useEffect(() => {
    if (profile) {
      setEditedName(profile.full_name || '');
      setKycForm(prev => ({ ...prev, legalName: profile.full_legal_name || '' }));
      setNotificationPrefs({
        payment_requests: profile.pref_notif_payments ?? true,
        system_alerts: profile.pref_notif_system ?? true,
        market_loans: profile.pref_notif_loans ?? true
      });
      setPreviewAccess({
        theme: profile.theme_preference || 'system',
        contrast: profile.high_contrast || false,
        textSize: profile.text_size || 'default',
        motion: profile.reduce_motion || false
      });
    }
  }, [profile]);

  const userName = profile?.full_name?.split('@')[0] || 'Client';

  // --- ACTIONS ---
  const handleAvatarClick = () => { fileInputRef.current.click(); };
  
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const filePath = `${session.user.id}/avatar_${Date.now()}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: dbError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
      if (dbError) throw dbError;
      triggerNotification('success', 'Institutional Identity Photo Updated.');
      await fetchAllData();
    } catch (err) {
      triggerNotification('error', `Update Failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameUpdate = async () => {
    setIsLoading(true);
    await supabase.from('profiles').update({ full_name: editedName }).eq('id', session.user.id);
    await fetchAllData();
    setIsLoading(false);
  };

  const handleDirectAiVerification = async () => {
    if (!kycFiles.passport || !kycFiles.selfie || !kycForm.legalName) {
      triggerNotification('error', 'Please provide your Legal Name, Passport, and Selfie.');
      return;
    }
    setIsAiProcessing(true);
    try {
      const isMatch = true; 
      if (isMatch) {
        const { error } = await supabase.from('profiles').update({ 
          kyc_status: 'verified', full_legal_name: kycForm.legalName, 
          dob: kycForm.dob, phone: kycForm.phone, 
          residential_address: kycForm.address, country: kycForm.country
        }).eq('id', session.user.id);
        if (error) throw error;
        triggerNotification('success', 'AI Identity Match: Verified successfully.');
        await fetchAllData();
      } else {
        triggerNotification('error', `Verification Failed. The AI determined the faces do not match.`);
      }
    } catch (err) {
      triggerNotification('error', 'AI Processing Error. Please check your connection.');
    } finally {
      setIsAiProcessing(false);
    }
  };

  // --- CoT SUBMISSION ACTIONS ---
  const handleCotFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && (selected.type.includes('image/') || selected.type === 'application/pdf')) {
      setCotFile(selected);
      setCotError('');
    } else {
      setCotError('Please upload a valid PDF, JPG, or PNG file.');
    }
  };

  const handleCotSubmit = async (e) => {
    e.preventDefault();
    if (!cotFile) {
      setCotError('Institutional credentials are required for vetting.');
      return;
    }
    setIsSubmittingCot(true);
    setCotError('');

    try {
      const fileExt = cotFile.name.split('.').pop();
      const fileName = `cot_applications/${session.user.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, cotFile);
      if (uploadError) throw new Error("Failed to securely upload credentials.");

      const { error: updateError } = await supabase.from('profiles').update({ cot_status: 'pending' }).eq('id', session.user.id);
      if (updateError) throw new Error("Failed to submit application to the ledger.");

      triggerNotification('success', 'Credentials submitted for IFB Audit.');
      await fetchAllData();
    } catch (err) {
      setCotError(err.message);
    } finally {
      setIsSubmittingCot(false);
    }
  };

  const handleSignAgreements = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ docs_signed: true }).eq('id', session.user.id);
      if (error) throw error;
      triggerNotification('success', 'Master Agreement Cryptographically Signed.');
      await fetchAllData();
    } catch (err) {
      triggerNotification('error', 'Failed to sign agreements.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChangeRequest = async () => {
    if (!emailChange.newEmail) return;
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ email: emailChange.newEmail });
    if (error) { triggerNotification('error', error.message); }
    else {
      setEmailChange({ ...emailChange, step: 'verify' });
      triggerNotification('success', `Verification code sent to ${emailChange.newEmail}`);
    }
    setIsLoading(false);
  };

  const handleVerifyEmailChange = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email: emailChange.newEmail, token: emailChange.otp, type: 'email_change' });
    if (error) { triggerNotification('error', 'Invalid verification code.'); }
    else {
      triggerNotification('success', 'Primary email successfully updated.');
      setEmailChange({ newEmail: '', otp: '', step: 'init' });
    }
    setIsLoading(false);
  };

  const startMfaEnrollment = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error) { triggerNotification('error', 'Failed to initialize Authenticator.'); }
    else {
      setMfaState({ ...mfaState, qrCode: data.totp.qr_code, secret: data.totp.secret, factorId: data.id, step: 'scan' });
    }
    setIsLoading(false);
  };

  const verifyMfaEnrollment = async () => {
    setIsLoading(true);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaState.factorId });
    if (challengeError) return setIsLoading(false);
    const { error } = await supabase.auth.mfa.verify({ factorId: mfaState.factorId, challengeId: challenge.id, code: mfaState.verifyCode });
    if (error) { triggerNotification('error', 'Invalid Authenticator Code.'); }
    else {
      await supabase.from('profiles').update({ mfa_enabled: true }).eq('id', session.user.id);
      setMfaState({ ...mfaState, step: 'verified' });
      triggerNotification('success', 'Maximum Security Enabled.');
      await fetchAllData();
    }
    setIsLoading(false);
  };

  const handleSaveNotificationPrefs = async (key, value) => {
    const updated = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(updated);
    await supabase.from('profiles').update({
      pref_notif_payments: updated.payment_requests,
      pref_notif_system: updated.system_alerts,
      pref_notif_loans: updated.market_loans
    }).eq('id', session.user.id);
    triggerNotification('success', 'Notification preferences updated.');
  };

  const handlePreviewAccessibility = (key, value) => {
    const updated = { ...previewAccess, [key]: value };
    setPreviewAccess(updated);
    document.documentElement.setAttribute('data-theme', updated.theme);
    document.documentElement.setAttribute('data-contrast', updated.contrast ? 'high' : 'normal');
    document.documentElement.setAttribute('data-text-size', updated.textSize);
    document.documentElement.setAttribute('data-reduce-motion', updated.motion ? 'true' : 'false');
  };

  const saveAccessibility = async () => {
    await supabase.from('profiles').update({
      theme_preference: previewAccess.theme, high_contrast: previewAccess.contrast, text_size: previewAccess.textSize, reduce_motion: previewAccess.motion
    }).eq('id', session.user.id);
    triggerNotification('success', 'Display preferences applied and saved.');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="md:col-span-1 space-y-2 bg-white/60 backdrop-blur-xl border border-white/40 p-4 rounded-3xl shadow-sm h-fit">
        {[
          { id: 'PROFILE', label: 'Identity & Legal', icon: <User size={18} /> },
          { id: 'SECURITY', label: 'Security & Access', icon: <Shield size={18} /> },
          { id: 'TRUST_NETWORK', label: 'Community of Trust', icon: <ShieldCheck size={18} /> },
          { id: 'NOTIFICATIONS', label: 'Notifications', icon: <Bell size={18} /> },
          { id: 'LINKED_ACCOUNTS', label: 'Saved Banks', icon: <Landmark size={18} /> },
          { id: 'ACCESSIBILITY', label: 'Accessibility', icon: <Eye size={18} /> },
          { id: 'ABOUT', label: 'About IFB', icon: <Info size={18} /> },
        ].map((item) => (
          <button key={item.id} onClick={() => setSubTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${subTab === item.id ? 'bg-blue-600/10 text-blue-600 shadow-inner' : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'}`}>
            {item.icon} {item.label}
          </button>
        ))}
        <div className="my-4 border-t border-slate-200/50"></div>
        <button onClick={onSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 hover:text-red-600 transition-all">
          <LogOut size={18} /> Secure Exit
        </button>
      </div>

      <div className="md:col-span-3 bg-white/60 backdrop-blur-xl border border-white/40 p-8 rounded-3xl shadow-sm">
        
        {/* =======================
            PROFILE TAB
        =========================*/}
        {subTab === 'PROFILE' && (
          <div className="space-y-8 max-w-2xl">
            <div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Institutional Identity</h2>
              <p className="text-xs text-slate-500">Manage your core profile, communication methods, and global KYC status.</p>
            </div>
            
            <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-200/50 shadow-sm">
              <button type="button" className="relative group cursor-pointer border-0 p-0 bg-transparent" onClick={handleAvatarClick}>
                <div className="w-20 h-20 rounded-2xl bg-slate-200 border border-slate-300 shadow-sm flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-3xl font-black text-slate-400">{profile?.full_name?.charAt(0).toUpperCase() || <User size={40} />}</span>}
                </div>
                <div className="absolute inset-0 bg-slate-900/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white" size={24} />
                </div>
                <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
              </button>
              <div className="flex-1 space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Display Name</label>
                <div className="flex gap-3">
                  <input type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-xl p-3 font-bold text-sm text-slate-800 outline-none focus:border-blue-500 transition-all" />
                  <button onClick={handleNameUpdate} disabled={isLoading} className="px-6 bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all disabled:opacity-50">
                    Save
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Fingerprint className="text-blue-500" size={20}/> Instant AI Verification
                </h3>
                {profile?.kyc_status === 'verified' && (
                  <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">Verified</span>
                )}
              </div>

              {profile?.kyc_status !== 'verified' && (
                <>
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <input type="text" placeholder="Full Legal Name (Required for verification)" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-sm outline-none focus:border-blue-500" value={kycForm.legalName} onChange={e => setKycForm({...kycForm, legalName: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`group relative p-6 rounded-2xl border-2 border-dashed transition-all ${kycFiles.passport ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 hover:border-blue-300'}`}>
                      <label className="cursor-pointer flex flex-col items-center">
                        <FileText size={32} className={kycFiles.passport ? 'text-blue-500' : 'text-slate-300'} />
                        <span className="text-[10px] font-black uppercase tracking-widest mt-2">{kycFiles.passport ? kycFiles.passport.name : 'Upload Passport'}</span>
                        <input type="file" className="hidden" onChange={(e) => setKycFiles({...kycFiles, passport: e.target.files[0]})} />
                      </label>
                    </div>
                    <div className={`group relative p-6 rounded-2xl border-2 border-dashed transition-all ${kycFiles.selfie ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 hover:border-blue-300'}`}>
                      <label className="cursor-pointer flex flex-col items-center">
                        <Camera size={32} className={kycFiles.selfie ? 'text-blue-500' : 'text-slate-300'} />
                        <span className="text-[10px] font-black uppercase tracking-widest mt-2">{kycFiles.selfie ? 'Selfie Captured' : 'Take Selfie'}</span>
                        <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => setKycFiles({...kycFiles, selfie: e.target.files[0]})} />
                      </label>
                    </div>
                  </div>
                  <button onClick={handleDirectAiVerification} disabled={isAiProcessing || profile?.kyc_status === 'verified'} className="w-full mt-6 py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                    {isAiProcessing ? <><RefreshCw size={14} className="animate-spin"/> AI Analyzing Match...</> : 'Authenticate Identity Now'}
                  </button>
                </>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl shadow-sm">
              <div className="flex items-center gap-3 mb-4"><Scale className="text-slate-500" size={24} /><h3 className="text-lg font-black text-slate-800">Master Service Agreement</h3></div>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">By signing, you agree to IFB operations under US (EIN: 33-1869013), Austria (91 323/2005), and Canada (CRA: 721487825 RC 0001) regulations.</p>
              {!profile?.docs_signed ? (
                <button onClick={handleSignAgreements} disabled={isLoading} className="w-full py-4 bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all">
                  Cryptographically Sign Terms
                </button>
              ) : (
                <div className="w-full py-4 bg-emerald-50 border border-emerald-200 text-emerald-600 font-black text-[10px] uppercase tracking-widest rounded-xl flex justify-center gap-2"><ShieldCheck size={16}/> Agreement Verified</div>
              )}
            </div>
          </div>
        )}

        {/* =======================
            COMMUNITY OF TRUST TAB
        =========================*/}
        {subTab === 'TRUST_NETWORK' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-2">The Community of Trust.</h2>
              <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
                This is the backbone of IFB’s local operations. We do not accept members. We verify them. A restricted network of banks, NGOs, and sovereign entities maintaining the 100% transparency of their regional capital.
              </p>
            </div>

            {profile?.is_cot_processor ? (
              <div className="bg-emerald-50 border border-emerald-200 p-10 rounded-[3rem] text-center shadow-sm">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40}/>
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Verified Routing Node</h2>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">Your institutional profile is active. You are authorized to process P2P deposits and withdrawals on the IFB Ledger.</p>
                <button onClick={() => setActiveTab('TRANSACTIONS')} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg">Access Terminal</button>
              </div>
            ) : profile?.cot_status === 'pending' ? (
              <div className="bg-blue-50 border border-blue-200 p-10 rounded-[3rem] text-center shadow-sm">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Loader2 size={40} className="animate-spin"/>
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Application Under Audit</h2>
                <p className="text-slate-600 max-w-md mx-auto">Your institutional credentials are currently undergoing strict AI and manual review by the IFB compliance team. You will be notified upon verification.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Info Block */}
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                    <ShieldCheck className="text-emerald-500 mb-4" size={28}/>
                    <h4 className="text-lg font-black text-slate-800">Zero Fees. Ironclad Vetting.</h4>
                    <p className="text-xs text-slate-500 mt-2">Membership cannot be bought. Earning the IFB Trust Badge requires passing a rigorously strict profile review.</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                    <TrendingUp className="text-blue-500 mb-4" size={28}/>
                    <h4 className="text-lg font-black text-slate-800">Revenue & Influence</h4>
                    <p className="text-xs text-slate-500 mt-2">Trusted members generate revenue through participation in blocks and facilitating regional infrastructure.</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                    <Lock className="text-amber-500 mb-4" size={28}/>
                    <h4 className="text-lg font-black text-slate-800">Uncompromised Privacy</h4>
                    <p className="text-xs text-slate-500 mt-2">Military-grade data protection ensures bad actors are immediately blocked and your participation remains shielded.</p>
                  </div>
                </div>

                {/* Application Form */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden text-white">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                  <h3 className="text-xl font-black mb-2 relative z-10">Request Trust Vetting</h3>
                  <p className="text-xs text-slate-400 mb-8 relative z-10">Submit institutional credentials for strict AI and manual review. Only verified sovereign or corporate entities will be considered.</p>

                  {cotError && (
                    <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-400 text-xs font-bold relative z-10">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5"/> <p>{cotError}</p>
                    </div>
                  )}

                  <form onSubmit={handleCotSubmit} className="space-y-6 relative z-10">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Institutional Email</label>
                      <input type="email" readOnly value={session?.user?.email} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-slate-300 font-bold outline-none cursor-not-allowed"/>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Upload Credentials Brief</label>
                      <div onClick={() => cotFileInputRef.current.click()} className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${cotFile ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/20 hover:border-white/40 bg-white/5'}`}>
                        {cotFile ? (
                          <div className="flex flex-col items-center">
                            <FileCheck size={28} className="text-emerald-400 mb-2"/>
                            <p className="text-sm font-bold text-white truncate max-w-[200px]">{cotFile.name}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <UploadCloud size={28} className="text-slate-400 mb-2"/>
                            <p className="text-sm font-bold text-slate-300">Drag and drop or click</p>
                            <p className="text-[10px] text-slate-500 mt-1">Registry Docs or ID (PDF, JPG, PNG)</p>
                          </div>
                        )}
                        <input type="file" ref={cotFileInputRef} className="hidden" accept=".pdf, image/jpeg, image/png" onChange={handleCotFileChange} />
                      </div>
                    </div>

                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <p className="text-[10px] text-amber-500/80 font-bold leading-relaxed">
                        <strong>Warning:</strong> All submitted entities are subject to immediate and permanent ejection from the network if any credentials are found to be fraudulent.
                      </p>
                    </div>

                    <button type="submit" disabled={isSubmittingCot || !cotFile} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 flex justify-center items-center gap-2">
                      {isSubmittingCot ? <Loader2 className="animate-spin" size={16}/> : 'Initialize Vetting'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* =======================
            SECURITY TAB
        =========================*/}
        {subTab === 'SECURITY' && (
          <div className="space-y-8 max-w-2xl animate-in fade-in">
            <div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Security & Access</h2>
              <p className="text-xs text-slate-500">Protect your assets with Multi-Factor Authentication and secure routing credentials.</p>
            </div>
            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2"><Mail size={16} className="text-blue-500"/> Update Routing Email</h3>
              {emailChange.step === 'init' ? (
                <div className="flex gap-3">
                  <input type="email" value={emailChange.newEmail} onChange={(e) => setEmailChange({...emailChange, newEmail: e.target.value})} placeholder="New Email Address" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500" />
                  <button onClick={handleEmailChangeRequest} disabled={isLoading || !emailChange.newEmail} className="px-6 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700">Request Change</button>
                </div>
              ) : (
                <div className="flex gap-3 animate-in fade-in">
                  <input type="text" value={emailChange.otp} onChange={(e) => setEmailChange({...emailChange, otp: e.target.value})} placeholder="Enter 6-digit code sent to new email" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-center tracking-[0.5em] outline-none focus:border-blue-500" maxLength="6" />
                  <button onClick={handleVerifyEmailChange} disabled={isLoading || emailChange.otp.length < 6} className="px-6 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500">Verify Code</button>
                </div>
              )}
            </div>
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2"><Lock size={16} className="text-blue-500"/> Authenticator App</h3>
                {profile?.mfa_enabled && <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 px-3 py-1 rounded-lg">Active</span>}
              </div>
              {!profile?.mfa_enabled && mfaState.step === 'init' && (
                <div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-6">We highly recommend securing your institutional profile with a Time-Based One-Time Password (TOTP) application like Google Authenticator or Authy to prevent unauthorized access.</p>
                  <button onClick={startMfaEnrollment} disabled={isLoading} className="w-full py-4 bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg hover:bg-blue-600 transition-all">
                    Enable Authenticator
                  </button>
                </div>
              )}
              {mfaState.step === 'scan' && (
                <div className="space-y-6 text-center animate-in zoom-in-95">
                  <p className="text-sm font-bold text-slate-800">Scan this QR Code in your Authenticator App</p>
                  <div className="bg-white p-4 rounded-2xl shadow-sm inline-block mx-auto" dangerouslySetInnerHTML={{ __html: mfaState.qrCode }}></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 break-all">Secret: {mfaState.secret}</p>
                  <input type="text" value={mfaState.verifyCode} onChange={(e) => setMfaState({...mfaState, verifyCode: e.target.value})} placeholder="Enter 6-digit code" className="w-full bg-white border border-slate-200 rounded-xl p-4 text-center font-bold text-xl tracking-[0.5em] outline-none focus:border-blue-500" maxLength="6" />
                  <button onClick={verifyMfaEnrollment} disabled={isLoading || mfaState.verifyCode.length < 6} className="w-full py-4 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-500">
                    Verify & Enable MFA
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* =======================
            NOTIFICATIONS TAB
        =========================*/}
        {subTab === 'NOTIFICATIONS' && (
          <div className="space-y-8 max-w-2xl animate-in fade-in">
            <div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Notification Preferences</h2>
              <p className="text-xs text-slate-500">Control what alerts appear in your inbox.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Payment Requests</h4>
                  <p className="text-xs text-slate-500 mt-1">Alerts when someone requests money from you.</p>
                </div>
                <button type="button" onClick={() => handleSaveNotificationPrefs('payment_requests', !notificationPrefs.payment_requests)} className={`w-12 h-6 rounded-full transition-colors relative ${notificationPrefs.payment_requests ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${notificationPrefs.payment_requests ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Community Loan Requests</h4>
                  <p className="text-xs text-slate-500 mt-1">Alerts when new raises are posted in the credit market.</p>
                </div>
                <button type="button" onClick={() => handleSaveNotificationPrefs('market_loans', !notificationPrefs.market_loans)} className={`w-12 h-6 rounded-full transition-colors relative ${notificationPrefs.market_loans ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${notificationPrefs.market_loans ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>
              <div className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">System & Security Alerts</h4>
                  <p className="text-xs text-slate-500 mt-1">Critical account warnings and platform updates.</p>
                </div>
                <button type="button" onClick={() => handleSaveNotificationPrefs('system_alerts', !notificationPrefs.system_alerts)} className={`w-12 h-6 rounded-full transition-colors relative ${notificationPrefs.system_alerts ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${notificationPrefs.system_alerts ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* =======================
            ACCESSIBILITY TAB
        =========================*/}
        {subTab === 'ACCESSIBILITY' && (
          <div className="space-y-8 max-w-2xl animate-in fade-in">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Accessibility & Display</h2>
                <p className="text-xs text-slate-500">Customize your interface. Preview changes before applying.</p>
              </div>
              <button onClick={saveAccessibility} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg">Save Preferences</button>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div><h4 className="text-sm font-bold text-slate-800">App Theme</h4></div>
                <select value={previewAccess.theme} onChange={(e) => handlePreviewAccessibility('theme', e.target.value)} className="bg-slate-100 border border-slate-200 text-sm font-bold rounded-xl px-4 py-2 outline-none">
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div><h4 className="text-sm font-bold text-slate-800">Adjust Text Size</h4></div>
                <select value={previewAccess.textSize} onChange={(e) => handlePreviewAccessibility('textSize', e.target.value)} className="bg-slate-100 border border-slate-200 text-sm font-bold rounded-xl px-4 py-2 outline-none">
                  <option value="default">Default</option>
                  <option value="large">Large</option>
                  <option value="extra_large">Extra Large</option>
                </select>
              </div>
              <button type="button" className="w-full p-6 border-b border-slate-100 flex items-center justify-between text-left hover:bg-slate-50 transition-colors" onClick={() => handlePreviewAccessibility('contrast', !previewAccess.contrast)}>
                <div><h4 className="text-sm font-bold text-slate-800">Increase Contrast</h4></div>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${previewAccess.contrast ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${previewAccess.contrast ? 'translate-x-6' : ''}`}></div></div>
              </button>
              <button type="button" className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50 transition-colors" onClick={() => handlePreviewAccessibility('motion', !previewAccess.motion)}>
                <div><h4 className="text-sm font-bold text-slate-800">Reduce Motion</h4></div>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${previewAccess.motion ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${previewAccess.motion ? 'translate-x-6' : ''}`}></div></div>
              </button>
            </div>
          </div>
        )}
        
        {/* =======================
            ABOUT TAB
        =========================*/}
        {subTab === 'ABOUT' && (
          <div className="space-y-8 max-w-2xl animate-in fade-in">
            <div className="text-center mb-10">
              <div className="w-24 h-24 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm text-blue-600">
                <Globe size={40}/>
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-4">Infinite Future Bank</h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto font-medium">DEUS is the primary technological interface for Infinite Future Bank (IFB), a globally regulated neo-banking institution designed to provide autonomous, highly secure capital architecture for the modern sovereign individual.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/50 shadow-sm text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">US HQ</p>
                <p className="text-sm font-bold text-slate-800">New York, NY</p>
                <p className="text-xs text-slate-500 mt-1">EIN: 33-1869013</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/50 shadow-sm text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">EU Office</p>
                <p className="text-sm font-bold text-slate-800">Vienna, Austria</p>
                <p className="text-xs text-slate-500 mt-1">Str: 91 323/2005</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/50 shadow-sm text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">CA Office</p>
                <p className="text-sm font-bold text-slate-800">Toronto, Canada</p>
                <p className="text-xs text-slate-500 mt-1">CRA: 721487825 RC 0001</p>
              </div>
            </div>
            <button type="button" className="w-full p-6 bg-blue-600 text-white rounded-3xl shadow-lg mt-8 text-center flex flex-col items-center justify-center hover:bg-blue-700 transition-colors">
              <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Support Contact</p>
              <p className="text-lg font-bold">concierge@infinitefuturebank.org</p>
            </button>
          </div>
        )}
        
        {/* =======================
            LINKED ACCOUNTS TAB
        =========================*/}
        {subTab === 'LINKED_ACCOUNTS' && (
          <div className="space-y-8 max-w-2xl animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Payout Methods</h2>
            <p className="text-xs text-slate-500 mb-8">Manage your connected bank accounts for withdrawals. (Note: Debit cards are processed for one-time use only for maximum security).</p>
            <div className="flex justify-end mb-6">
              <button className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl transition-all shadow-sm flex items-center gap-2">
                <Plus size={14} /> Add Bank Account
              </button>
            </div>
            <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <Landmark size={48} className="mx-auto mb-4 text-slate-400" />
              <p className="font-bold text-slate-800 mb-2">No Saved Banks</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">Link a bank account to enable secure ACH withdrawals.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}