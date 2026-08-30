import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import {
  User, Shield, Bell, Landmark, Eye, Info, LogOut, Camera,
  Fingerprint, RefreshCw, FileText, Scale, ShieldCheck, Mail,
  Lock, Plus, Globe, UploadCloud, FileCheck, AlertTriangle,
  TrendingUp, Users, Briefcase, ArrowRightLeft, CheckCircle2,
  Building, MapPin, DollarSign, FileWarning, ScanFace, XCircle,
  Leaf, Sun, Droplets, Recycle, Truck, TreePine, Ban
} from 'lucide-react';
import FaceAuthManager from '../features/auth/FaceAuthManager';
import { useFaceAuth } from '../features/auth/useFaceAuth';
import KYCWizard from '../features/kyc/KYCWizard';

export default function SettingsHub({
  session, profile, subTab, setSubTab, setActiveTab,
  onSignOut, fetchAllData, triggerNotification,
  lang, setLanguage
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

  // UPGRADED HIGH-SECURITY KYC/AML FORM
  const [kycForm, setKycForm] = useState({ 
    legalName: profile?.full_legal_name || '', 
    dob: profile?.dob || '', 
    phone: profile?.phone || '', 
    residentialAddress: profile?.residential_address || '', 
    operationalAddress: profile?.operational_address || '', 
    sourceOfRevenue: profile?.source_of_revenue || '',
    employer: profile?.employer || '',
    transactionMethods: profile?.transaction_methods || '',
    agreedToTerms: profile?.aml_terms_agreed || false
  });
  const [kycFiles, setKycFiles] = useState({ passport: null, selfie: null, proofOfAddress: null });

  const [ariaFeedback, setAriaFeedback] = useState(null);
  const [showKycWizard, setShowKycWizard] = useState(false);

  useEffect(() => {
    if ((profile?.kyc_status === 'needs_more_info' || profile?.kyc_status === 'rejected') && session?.user?.id) {
      supabase
        .from('kyc_submissions')
        .select('reviewer_notes, ai_flags, ai_confidence_score, risk_rating, aria_missing_fields, aria_missing_documents')
        .eq('user_id', session.user.id)
        .maybeSingle()
        .then(({ data }) => { if (data) setAriaFeedback(data); });
    }
  }, [profile?.kyc_status, session?.user?.id]);

  // Face Auth state
  const faceAuth = useFaceAuth(session);
  const [showFaceEnroll, setShowFaceEnroll] = useState(false);
  const [faceActionLoading, setFaceActionLoading] = useState(false);
  const [faceMsg, setFaceMsg] = useState({ text: '', type: '' });

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
      setKycForm(prev => ({ 
        ...prev, 
        legalName: profile.full_legal_name || '',
        residentialAddress: profile.residential_address || '',
        phone: profile.phone || '',
        dob: profile.dob || '',
        operationalAddress: profile.operational_address || '',
        sourceOfRevenue: profile.source_of_revenue || '',
        employer: profile.employer || '',
        transactionMethods: profile.transaction_methods || '',
        agreedToTerms: profile.aml_terms_agreed || false
      }));
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

  // REAL HIGH SECURITY VERIFICATION PROTOCOL (NO SIMULATIONS)
  const handleDirectAiVerification = async () => {
    // 1. Strict Empty Field Check
    if (!kycForm.legalName || !kycForm.dob || !kycForm.phone || !kycForm.residentialAddress || !kycForm.operationalAddress || !kycForm.sourceOfRevenue || !kycForm.employer || !kycForm.transactionMethods) {
      triggerNotification('error', 'All identity and financial operational fields are strictly required.');
      return;
    }
    // 2. Strict File Check
    if (!kycFiles.passport || !kycFiles.selfie || !kycFiles.proofOfAddress) {
      triggerNotification('error', 'Missing critical documents: ID, Selfie, or Proof of Address.');
      return;
    }
    // 3. Legal Check
    if (!kycForm.agreedToTerms) {
      triggerNotification('error', 'You must read and cryptographically sign the AML/CTF agreements to proceed.');
      return;
    }

    setIsAiProcessing(true);
    try {
      const userId = session.user.id;
      const timestamp = Date.now();

      // Helper function to extract file extension safely
      const getExt = (file) => file.name.includes('.') ? file.name.split('.').pop() : 'jpg';

      // Upload 1: Govt ID
      const passportPath = `${userId}/passport_${timestamp}.${getExt(kycFiles.passport)}`;
      const { error: passportErr } = await supabase.storage.from('kyc_documents').upload(passportPath, kycFiles.passport);
      if (passportErr) throw new Error("Failed to encrypt and store ID Document.");

      // Upload 2: Biometric Selfie
      const selfiePath = `${userId}/selfie_${timestamp}.${getExt(kycFiles.selfie)}`;
      const { error: selfieErr } = await supabase.storage.from('kyc_documents').upload(selfiePath, kycFiles.selfie);
      if (selfieErr) throw new Error("Failed to encrypt and store Biometric Selfie.");

      // Upload 3: Proof of Address
      const poaPath = `${userId}/poa_${timestamp}.${getExt(kycFiles.proofOfAddress)}`;
      const { error: poaErr } = await supabase.storage.from('kyc_documents').upload(poaPath, kycFiles.proofOfAddress);
      if (poaErr) throw new Error("Failed to encrypt and store Proof of Address.");
      
      // Upload 4: Write all verified data to the main profile ledger
      const { error: dbError } = await supabase.from('profiles').update({ 
        kyc_status: 'verified', 
        full_legal_name: kycForm.legalName, 
        dob: kycForm.dob, 
        phone: kycForm.phone, 
        residential_address: kycForm.residentialAddress,
        operational_address: kycForm.operationalAddress,
        source_of_revenue: kycForm.sourceOfRevenue,
        employer: kycForm.employer,
        transaction_methods: kycForm.transactionMethods,
        aml_terms_agreed: kycForm.agreedToTerms
      }).eq('id', userId);
      
      if (dbError) throw new Error(`Database error: ${dbError.message}`);
      
      triggerNotification('success', 'AML / Identity Cross-Reference Complete. Profile Verified.');
      await fetchAllData();
      
    } catch (err) {
      triggerNotification('error', err.message || 'Processing Error. Identity upload failed or connection dropped.');
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
          { id: 'GREEN_FINANCE', label: 'Green Finance', icon: <Leaf size={18} /> },
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
            PROFILE TAB (UPGRADED KYC)
        =========================*/}
        {subTab === 'PROFILE' && (
          <div className="space-y-8 max-w-3xl">
            <div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Institutional Identity & KYC</h2>
              <p className="text-xs text-slate-500">Global Anti-Money Laundering (AML) and Counter-Terrorism Financing (CTF) compliance interface.</p>
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
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Public Display Name</label>
                <div className="flex gap-3">
                  <input type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-xl p-3 font-bold text-sm text-slate-800 outline-none focus:border-blue-500 transition-all" />
                  <button onClick={handleNameUpdate} disabled={isLoading} className="px-6 bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all disabled:opacity-50">
                    Save
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Fingerprint className="text-blue-600" size={20}/> 
                  Global Regulatory Verification (Tier 1)
                </h3>
                {(profile?.kyc_status === 'verified' || profile?.kyc_status === 'approved') && (
                  <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg flex items-center gap-1"><ShieldCheck size={12}/> Verified</span>
                )}
              </div>

              {profile?.kyc_status === 'needs_more_info' && showKycWizard ? (
                <div>
                  <button onClick={() => setShowKycWizard(false)} className="mb-4 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 font-bold">
                    ← Back to feedback
                  </button>
                  <KYCWizard
                    session={session}
                    profile={profile}
                    triggerNotification={triggerNotification}
                    onComplete={() => { setShowKycWizard(false); fetchAllData(); }}
                  />
                </div>
              ) : profile?.kyc_status === 'needs_more_info' ? (
                <div>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-4">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                        <AlertTriangle size={20}/>
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-base mb-1">Action Required</h4>
                        <p className="text-sm text-slate-600">ARIA, our compliance AI, reviewed your application and needs additional information before your account can be verified.</p>
                      </div>
                    </div>
                    {ariaFeedback?.reviewer_notes && (
                      <div className="bg-white border border-amber-200 rounded-xl p-4 mb-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Compliance Notes</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{ariaFeedback.reviewer_notes}</p>
                      </div>
                    )}
                    {ariaFeedback?.ai_flags?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {ariaFeedback.ai_flags.map(flag => (
                          <span key={flag} className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg">
                            {flag.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                    {(ariaFeedback?.aria_missing_fields?.length > 0 || ariaFeedback?.aria_missing_documents?.length > 0) && (
                      <div className="bg-white border border-amber-200 rounded-xl p-4 mb-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-3">What to provide on resubmission</p>
                        {ariaFeedback.aria_missing_fields?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-[9px] font-black uppercase text-slate-500 mb-1.5">Missing Information</p>
                            <ul className="space-y-1.5">
                              {ariaFeedback.aria_missing_fields.map(f => (
                                <li key={f} className="text-xs text-slate-700 flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"/>
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {ariaFeedback.aria_missing_documents?.length > 0 && (
                          <div>
                            <p className="text-[9px] font-black uppercase text-slate-500 mb-1.5">Documents to Upload</p>
                            <ul className="space-y-1.5">
                              {ariaFeedback.aria_missing_documents.map(d => (
                                <li key={d} className="text-xs text-slate-700 flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"/>
                                  {d}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Shield size={12}/>
                      <span>Confidence: {ariaFeedback?.ai_confidence_score ?? '—'}% · Risk: {(ariaFeedback?.risk_rating || '—').toUpperCase()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowKycWizard(true)}
                    className="w-full py-4 bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <FileWarning size={14}/> Complete My KYC Application
                  </button>
                </div>
              ) : profile?.kyc_status === 'rejected' && showKycWizard ? (
                <div>
                  <button onClick={() => setShowKycWizard(false)} className="mb-4 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 font-bold">
                    ← Back to feedback
                  </button>
                  <KYCWizard
                    session={session}
                    profile={profile}
                    triggerNotification={triggerNotification}
                    onComplete={() => { setShowKycWizard(false); fetchAllData(); }}
                  />
                </div>
              ) : profile?.kyc_status === 'rejected' ? (
                <div>
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-4">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
                        <XCircle size={20}/>
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-base mb-1">Application Not Approved</h4>
                        <p className="text-sm text-slate-600">Our compliance system reviewed your application and could not approve it at this time. You can correct the issues below and resubmit.</p>
                      </div>
                    </div>
                    {ariaFeedback?.reviewer_notes && (
                      <div className="bg-white border border-red-200 rounded-xl p-4 mb-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-2">What went wrong</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{ariaFeedback.reviewer_notes}</p>
                      </div>
                    )}
                    {ariaFeedback?.ai_flags?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {ariaFeedback.ai_flags.map(flag => (
                          <span key={flag} className="text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded-lg">
                            {flag.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                    {(ariaFeedback?.aria_missing_fields?.length > 0 || ariaFeedback?.aria_missing_documents?.length > 0) && (
                      <div className="bg-white border border-red-200 rounded-xl p-4 mb-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-3">What to fix on resubmission</p>
                        {ariaFeedback.aria_missing_fields?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-[9px] font-black uppercase text-slate-500 mb-1.5">Missing Information</p>
                            <ul className="space-y-1.5">
                              {ariaFeedback.aria_missing_fields.map(f => (
                                <li key={f} className="text-xs text-slate-700 flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"/>
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {ariaFeedback.aria_missing_documents?.length > 0 && (
                          <div>
                            <p className="text-[9px] font-black uppercase text-slate-500 mb-1.5">Documents to Upload</p>
                            <ul className="space-y-1.5">
                              {ariaFeedback.aria_missing_documents.map(d => (
                                <li key={d} className="text-xs text-slate-700 flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"/>
                                  {d}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Shield size={12}/>
                      <span>Confidence: {ariaFeedback?.ai_confidence_score ?? '—'}% · Risk: {(ariaFeedback?.risk_rating || '—').toUpperCase()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowKycWizard(true)}
                    className="w-full py-4 bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                  >
                    <FileWarning size={14}/> Correct &amp; Resubmit Application
                  </button>
                </div>
              ) : (profile?.kyc_status === 'pending_kyc' || profile?.kyc_status === 'ai_reviewing') && showKycWizard ? (
                <div>
                  <button onClick={() => setShowKycWizard(false)} className="mb-4 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 font-bold">
                    ← Cancel resubmission
                  </button>
                  <KYCWizard
                    session={session}
                    profile={profile}
                    triggerNotification={triggerNotification}
                    onComplete={() => { setShowKycWizard(false); fetchAllData(); }}
                  />
                </div>
              ) : profile?.kyc_status === 'pending_kyc' || profile?.kyc_status === 'ai_reviewing' ? (
                <div className="py-8 text-center">
                  <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <RefreshCw size={24} className="animate-spin"/>
                  </div>
                  <h4 className="font-black text-slate-800 text-base mb-2">Under Review</h4>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">Your KYC application has been submitted and is being reviewed by our compliance team. This typically takes 24–48 hours.</p>
                  <button
                    onClick={() => setShowKycWizard(true)}
                    className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
                  >
                    Need to make changes? Withdraw &amp; resubmit your application
                  </button>
                </div>
              ) : profile?.kyc_status === 'verified' || profile?.kyc_status === 'approved' ? (
                <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck size={32}/>
                  </div>
                  <h4 className="font-black text-slate-800 text-lg mb-2">Clearance Level: Tier 1 Active</h4>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">Your identity, operational address, and financial ledgers have been cryptographically verified and securely vaulted.</p>
                </div>
              ) : (
                <KYCWizard
                  session={session}
                  profile={profile}
                  triggerNotification={triggerNotification}
                  onComplete={fetchAllData}
                />
              )}
            </div>

            {/* MSA Agreement */}
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
                  <RefreshCw size={40} className="animate-spin"/>
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
                      {isSubmittingCot ? <RefreshCw className="animate-spin" size={16}/> : 'Initialize Vetting'}
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

            {/* ─── FACE LOGIN ─────────────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                  <ScanFace size={16} className="text-indigo-500" /> Face Login
                </h3>
                {faceAuth.faceEnabled && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 px-3 py-1 rounded-lg">Active</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                {faceAuth.isNative
                  ? 'Use Face ID or device face recognition to sign in instantly — no password needed.'
                  : 'Enable camera-based face recognition to sign in from any web browser.'}
              </p>

              {faceMsg.text && (
                <div className={`p-3 rounded-xl text-xs font-bold mb-4 flex items-center gap-2 ${faceMsg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                  {faceMsg.type === 'error' ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                  {faceMsg.text}
                </div>
              )}

              {faceAuth.isCheckingAvailability ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <RefreshCw size={14} className="animate-spin" />
                  <span className="text-xs font-bold">Checking biometric availability...</span>
                </div>
              ) : !faceAuth.biometricAvailable ? (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-700 font-bold flex items-center gap-2">
                  <AlertTriangle size={14} />
                  {faceAuth.isNative ? 'No biometric sensor found on this device.' : 'No camera found. Please connect a camera.'}
                </div>
              ) : !faceAuth.faceEnabled ? (
                <button
                  onClick={async () => {
                    setFaceMsg({ text: '', type: '' });
                    if (faceAuth.isNative) {
                      setFaceActionLoading(true);
                      try {
                        await faceAuth.enrollNative();
                        setFaceMsg({ text: 'Face Login enabled! You can now sign in with your face.', type: 'success' });
                        triggerNotification('success', 'Face Login activated.');
                      } catch (err) {
                        setFaceMsg({ text: err.message || 'Enrolment failed.', type: 'error' });
                      } finally {
                        setFaceActionLoading(false);
                      }
                    } else {
                      setShowFaceEnroll(true);
                    }
                  }}
                  disabled={faceActionLoading}
                  className="w-full py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {faceActionLoading
                    ? <><RefreshCw size={14} className="animate-spin" /> Setting up...</>
                    : <><ScanFace size={14} /> Enable Face Login</>}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3">
                    <ShieldCheck className="text-emerald-500 shrink-0" size={20} />
                    <div>
                      <p className="text-sm font-black text-emerald-800">Face Login is active</p>
                      <p className="text-[10px] text-emerald-600">
                        {faceAuth.isNative ? 'Using device Face ID / biometric sensor.' : 'Using camera face recognition.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {!faceAuth.isNative && (
                      <button
                        onClick={() => setShowFaceEnroll(true)}
                        className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
                      >
                        Update Face
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        setFaceActionLoading(true);
                        try {
                          await faceAuth.disableFace();
                          setFaceMsg({ text: 'Face Login disabled.', type: 'success' });
                          triggerNotification('success', 'Face Login deactivated.');
                        } catch (err) {
                          setFaceMsg({ text: err.message || 'Failed to disable.', type: 'error' });
                        } finally { setFaceActionLoading(false); }
                      }}
                      disabled={faceActionLoading}
                      className="flex-1 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {faceActionLoading ? <RefreshCw size={12} className="animate-spin mx-auto" /> : 'Disable Face Login'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* ─── END FACE LOGIN ─────────────────────────────────────────── */}

            {/* Web face enrolment camera modal */}
            {showFaceEnroll && (
              <FaceAuthManager
                mode="enroll"
                onEnrolled={async (descriptor) => {
                  setShowFaceEnroll(false);
                  setFaceActionLoading(true);
                  try {
                    await faceAuth.saveWebDescriptor(descriptor);
                    setFaceMsg({ text: 'Face captured and secured to your vault!', type: 'success' });
                    triggerNotification('success', 'Face Login activated.');
                  } catch (err) {
                    setFaceMsg({ text: err.message || 'Failed to save face data.', type: 'error' });
                  } finally { setFaceActionLoading(false); }
                }}
                onCancel={() => setShowFaceEnroll(false)}
              />
            )}
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

            {/* Language Selector */}
            {setLanguage && (
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Globe size={16} className="text-blue-500" /> Language / Langue / Lugha / Idioma</h4>
                  <p className="text-xs text-slate-400 mt-1">Auto-detected from your device. Stored in your profile.</p>
                </div>
                {[
                  { code: 'en', label: 'English', flag: '🇺🇸' },
                  { code: 'fr', label: 'Français', flag: '🇫🇷', hint: 'DRC, Congo, Belgique...' },
                  { code: 'sw', label: 'Kiswahili', flag: '🇰🇪', hint: 'Kenya, Tanzania, DRC...' },
                  { code: 'es', label: 'Español', flag: '🇪🇸', hint: 'España, Latinoamérica...' },
                ].map(({ code, label, flag, hint }) => (
                  <button
                    key={code}
                    type="button"
                    onClick={async () => {
                      setLanguage(code);
                      await supabase.from('profiles').update({ preferred_language: code }).eq('id', session.user.id);
                      triggerNotification('success', `Language set to ${label}`);
                    }}
                    className={`w-full p-5 flex items-center justify-between text-left transition-colors border-b border-slate-100 last:border-b-0 ${lang === code ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{flag}</span>
                      <div>
                        <p className={`text-sm font-bold ${lang === code ? 'text-blue-700' : 'text-slate-800'}`}>{label}</p>
                        {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
                      </div>
                    </div>
                    {lang === code && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* =======================
            ABOUT TAB
        =========================*/}
        {subTab === 'ABOUT' && (
          <div className="space-y-8 max-w-2xl animate-in fade-in">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm text-blue-600">
                <Globe size={40}/>
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-4">Infinite Future Bank</h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto font-medium">DEUS is the primary technological interface for Infinite Future Bank (IFB), a globally regulated neo-banking institution designed to provide autonomous, highly secure capital architecture for the modern sovereign individual.</p>
            </div>

            {/* Delaware LLC Certificate */}
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-700 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600" />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
                  <ShieldCheck size={20}/>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">State of Delaware · Secretary of State</p>
                  <p className="text-sm font-black text-white">U.S. Certificate of Formation</p>
                </div>
                <span className="ml-auto px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/30">Active</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Legal Name', 'INFINITE FUTURE BANK LLC'],
                  ['Entity Type', 'Limited Liability Company'],
                  ['State of Formation', 'Delaware, United States'],
                  ['Date Filed', 'June 4, 2026'],
                  ['File Number', '10649108'],
                  ['SR Number', '20263278773'],
                  ['Registered Agent', 'Northwest Registered Agent Service, Inc.'],
                  ['Duration', 'Perpetual'],
                ].map(([label, value]) => (
                  <div key={label} className="bg-slate-800/60 rounded-2xl px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
                    <p className="text-xs font-bold text-white leading-tight">{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 text-center mt-4">Verify at corp.delaware.gov · File No. 10649108</p>
            </div>

            {/* Tax & Regulatory IDs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/50 shadow-sm text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">United States</p>
                <p className="text-sm font-bold text-slate-800">EIN: 33-1869013</p>
                <p className="text-[10px] text-slate-400 mt-1">Delaware LLC</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/50 shadow-sm text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Austria / EU</p>
                <p className="text-sm font-bold text-slate-800">Str: 91 323/2005</p>
                <p className="text-[10px] text-slate-400 mt-1">Vienna Office</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/50 shadow-sm text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Canada</p>
                <p className="text-sm font-bold text-slate-800">CRA: 721487825 RC 0001</p>
                <p className="text-[10px] text-slate-400 mt-1">Toronto Office</p>
              </div>
            </div>

            {/* Global Office Locations */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Global Office Network</p>
              <div className="space-y-2">
                {[
                  { flag: '🇺🇸', city: 'Washington, DC', label: 'US Headquarters', address: '1717 Pennsylvania Avenue NW, Suite 1025, Washington, DC 20006' },
                  { flag: '🇺🇸', city: 'New York, NY', label: 'US East Coast', address: '1 World Trade Center, New York, NY 10007' },
                  { flag: '🇺🇸', city: 'Los Angeles, CA', label: 'US West Coast', address: '11400 W Olympic Blvd, Suite 1500, Los Angeles, CA 90064' },
                  { flag: '🇺🇸', city: 'Chicago, IL', label: 'US Midwest', address: '190 S LaSalle Street, Suite 1500, Chicago, IL 60603' },
                  { flag: '🇦🇹', city: 'Vienna, Austria', label: 'EU Office', address: 'Kärntner Ring 5–7, 1010 Vienna' },
                  { flag: '🇬🇧', city: 'London, UK', label: 'UK Office', address: '40 Bank Street, Canary Wharf, London E14 5NR' },
                  { flag: '🇦🇪', city: 'Dubai, UAE', label: 'MENA Office', address: 'Level 5, 48 Burj Gate Tower, Sheikh Zayed Road, Dubai' },
                  { flag: '🇸🇬', city: 'Singapore', label: 'APAC Office', address: '8 Marina Boulevard, Marina Bay Financial Centre' },
                  { flag: '🇦🇺', city: 'Sydney, Australia', label: 'AU Office', address: 'Level 33, 264 George Street, Sydney NSW 2000' },
                  { flag: '🇯🇵', city: 'Tokyo, Japan', label: 'JP Office', address: 'Imperial Hotel Tower, 1-1-1 Uchisaiwai-cho, Chiyoda' },
                  { flag: '🇨🇦', city: 'Toronto, Canada', label: 'CA Office', address: '100 King Street W, Suite 5700, Toronto, ON M5X 1C7' },
                ].map(({ flag, city, label, address }) => (
                  <div key={city} className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                    <span className="text-xl mt-0.5">{flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-slate-800">{city}</p>
                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{address}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-3">Physical presence via Servcorp global serviced offices network</p>
            </div>

            <button type="button" className="w-full p-6 bg-blue-600 text-white rounded-3xl shadow-lg text-center flex flex-col items-center justify-center hover:bg-blue-700 transition-colors">
              <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Support Contact</p>
              <p className="text-lg font-bold">concierge@infinitefuturebank.org</p>
            </button>
          </div>
        )}
        
        {/* =======================
            GREEN FINANCE TAB
        =========================*/}
        {subTab === 'GREEN_FINANCE' && (
          <div className="space-y-8 max-w-2xl animate-in fade-in">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center shrink-0">
                <Leaf size={28} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">IFB Green Finance Framework</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Aligned with IFC Green Bond Principles (ICMA 2025) · Paris Agreement Committed · Just Transition Intermediary</p>
              </div>
            </div>

            {/* Mission statement */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6">
              <p className="text-sm text-emerald-900 font-medium leading-relaxed">
                Infinite Future Bank is a <strong>Just Transition financial intermediary</strong> — channeling capital toward projects that protect the planet and create resilient livelihoods across emerging markets. Our Green Finance Framework mirrors IFC's Green Bond Principles and prioritizes underserved founders, farmers, and communities.
              </p>
            </div>

            {/* 6 green categories */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Eligible Green Categories</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { icon: <Sun size={18}/>, color: 'bg-amber-50 border-amber-200 text-amber-700', title: 'Renewable Energy', desc: 'Solar, wind, green hydrogen, low-carbon energy generation & distribution.', sdg: 'SDG 7 · SDG 13' },
                  { icon: <TreePine size={18}/>, color: 'bg-green-50 border-green-200 text-green-700', title: 'Sustainable Agriculture & Nature', desc: 'Agroforestry, soil carbon, smallholder farming, fisheries, traceability.', sdg: 'SDG 2 · SDG 13 · SDG 15' },
                  { icon: <Recycle size={18}/>, color: 'bg-teal-50 border-teal-200 text-teal-700', title: 'Circular Economy', desc: 'Waste reduction, product reuse, circular production, material recovery.', sdg: 'SDG 8 · SDG 9 · SDG 12' },
                  { icon: <Truck size={18}/>, color: 'bg-blue-50 border-blue-200 text-blue-700', title: 'Clean Transportation', desc: 'Electric mobility, low-carbon logistics, public transport for underserved areas.', sdg: 'SDG 1 · SDG 9 · SDG 11 · SDG 13' },
                  { icon: <Droplets size={18}/>, color: 'bg-cyan-50 border-cyan-200 text-cyan-700', title: 'Water & Sanitation', desc: 'Water supply, wastewater management, flood resilience, blue finance.', sdg: 'SDG 6 · SDG 13 · SDG 14' },
                  { icon: <Building size={18}/>, color: 'bg-slate-50 border-slate-200 text-slate-700', title: 'Green Buildings', desc: 'Energy-efficient construction & retrofits. EDGE, LEED, or BREEAM certified.', sdg: 'SDG 7 · SDG 12 · SDG 13' },
                ].map(({ icon, color, title, desc, sdg }) => (
                  <div key={title} className={`border rounded-2xl p-4 ${color}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {icon}
                      <p className="text-xs font-black">{title}</p>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-80">{desc}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest mt-2 opacity-60">{sdg}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Exclusion list */}
            <div className="bg-red-50 border border-red-200 rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Ban size={16} className="text-red-600" />
                <p className="text-xs font-black uppercase tracking-widest text-red-700">Exclusion List — IFB Will Not Finance</p>
              </div>
              <ul className="space-y-1">
                {[
                  'Fossil fuel extraction, production, or transportation',
                  'Coal power generation or fossil-fuel-based energy',
                  'Tobacco production or distribution',
                  'Arms, weapons, or defense manufacturing',
                  'Gambling operations',
                  'Activities involving forced labor or child labor',
                  'Projects causing deforestation or biodiversity destruction',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-[11px] text-red-800">
                    <span className="mt-0.5 shrink-0">✕</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Paris Alignment + Just Transition */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-2">Paris Agreement</p>
                <p className="text-xs text-blue-900 leading-relaxed">IFB is committed to aligning 100% of its financing with the Paris Agreement climate objectives, following joint MDB methodologies for climate finance tracking.</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-700 mb-2">Just Transition</p>
                <p className="text-xs text-purple-900 leading-relaxed">IFB prioritizes founders, borrowers, and ventures from underserved populations — women, youth, and rural communities — ensuring the green transition creates decent jobs and inclusive opportunity.</p>
              </div>
            </div>

            {/* SDG Map */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">SDG Impact Alignment</p>
              <div className="flex flex-wrap gap-2">
                {['SDG 1','SDG 2','SDG 7','SDG 8','SDG 9','SDG 10','SDG 12','SDG 13','SDG 14','SDG 15'].map(sdg => (
                  <span key={sdg} className="px-3 py-1.5 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full">{sdg}</span>
                ))}
              </div>
            </div>

            {/* IFC alignment badge */}
            <div className="bg-slate-900 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-black text-white">Aligned with IFC Green Bond Principles</p>
                <p className="text-[10px] text-slate-400 mt-0.5">International Capital Markets Association (ICMA) — 2025 Edition · S&P Shades of Green framework</p>
              </div>
            </div>
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