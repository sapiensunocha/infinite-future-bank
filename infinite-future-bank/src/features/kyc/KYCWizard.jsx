import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  User, MapPin, Briefcase, Shield, Building2, FileText,
  CheckCircle2, ChevronRight, ChevronLeft, Upload, Loader2,
  Globe, DollarSign, ShieldCheck, X, Camera,
  Brain, ScanFace, Sparkles, AlertTriangle, CheckCheck
} from 'lucide-react';

// ── Steps ─────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'personal',   label: 'About You',    icon: User,       hint: 'Legal identity & contact details' },
  { id: 'scan',       label: 'Scan ID',      icon: ScanFace,   hint: 'AI-powered document extraction' },
  { id: 'finances',   label: 'Finances',     icon: DollarSign, hint: 'Income, assets & source of funds' },
  { id: 'compliance', label: 'Declarations', icon: Shield,     hint: 'AML · PEP · FATCA / CRS' },
  { id: 'submit',     label: 'Submit',       icon: ShieldCheck,hint: 'Supporting documents & review' },
];

// ── Design tokens ─────────────────────────────────────────────────────────────

const inp = 'w-full bg-slate-800/50 border border-slate-700/60 px-4 py-3 rounded-xl text-sm font-medium text-white outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10 transition-all placeholder:text-slate-500 hover:border-slate-600';
const sel = inp + ' cursor-pointer';
const lbl = 'block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5';

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return <div><label className={lbl}>{label}</label>{children}</div>;
}

function Sect({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-700/40 pb-2 mb-4 mt-7 first:mt-0">
      <Icon size={13} className="text-violet-400 shrink-0" />
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</span>
    </div>
  );
}

function Toggle({ id, checked, onChange, color = 'violet', children }) {
  const ring = {
    violet: 'border-violet-700/40 bg-violet-950/20',
    amber:  'border-amber-700/30  bg-amber-950/20',
    red:    'border-red-700/30    bg-red-950/20',
    blue:   'border-blue-700/30   bg-blue-950/20',
  };
  return (
    <div className={`flex items-start gap-3 border rounded-xl p-4 ${ring[color]}`}>
      <input type="checkbox" id={id} checked={checked} onChange={onChange}
        className="w-4 h-4 mt-0.5 rounded shrink-0 cursor-pointer accent-violet-500" />
      <label htmlFor={id} className="text-xs font-semibold text-slate-300 leading-relaxed cursor-pointer">{children}</label>
    </div>
  );
}

// ── Camera modal ──────────────────────────────────────────────────────────────

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => setReady(true));
        }
      })
      .catch(() => onClose());
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const snap = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob(blob => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      onCapture(new File([blob], `kyc_${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  };

  const close = () => { streamRef.current?.getTracks().forEach(t => t.stop()); onClose(); };

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/80 to-transparent">
        <span className="text-white font-black text-sm tracking-tight">IFB Secure Camera</span>
        <button onClick={close} className="text-white/70 hover:text-white transition-colors"><X size={22}/></button>
      </div>
      <video ref={videoRef} playsInline muted className="flex-1 w-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      {/* guide overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="border-2 border-white/30 rounded-2xl" style={{ width: '80%', aspectRatio: '1.58' }} />
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex justify-center items-center gap-10 pb-10 pt-8 bg-gradient-to-t from-black/70 to-transparent">
        <button onClick={close} className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30">
          <X size={18}/>
        </button>
        <button onClick={snap} disabled={!ready}
          className="w-20 h-20 rounded-full bg-white shadow-2xl border-[5px] border-white/40 disabled:opacity-30 active:scale-90 transition-all" />
        <div className="w-12"/>
      </div>
    </div>
  );
}

// ── Document upload zone ──────────────────────────────────────────────────────

function DocZone({ label, field, files, onChange, required, accept = 'image/*,application/pdf', capture = false }) {
  const fileRef = useRef();
  const [cameraOpen, setCameraOpen] = useState(false);
  const file = files[field];
  const isImg = file?.type?.startsWith('image/');
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (isImg && file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  return (
    <div>
      {cameraOpen && (
        <CameraCapture
          onCapture={f => { onChange(field, f); setCameraOpen(false); }}
          onClose={() => setCameraOpen(false)}
        />
      )}
      <label className={lbl}>{label}{required && <span className="text-violet-400 ml-0.5">*</span>}</label>

      {previewUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-600/50 group cursor-pointer" onClick={() => fileRef.current.click()}>
          <img src={previewUrl} alt="" className="w-full h-32 object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-[10px] font-black uppercase bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">Replace</span>
          </div>
          <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <CheckCircle2 size={12} className="text-white"/>
          </div>
          <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] text-white font-bold px-2 py-1 truncate">{file.name}</p>
        </div>
      ) : file ? (
        <div className="flex items-center gap-3 bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-3 cursor-pointer" onClick={() => fileRef.current.click()}>
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0"/>
          <span className="text-xs text-emerald-300 font-bold truncate flex-1">{file.name}</span>
          <button type="button" onClick={e => { e.stopPropagation(); onChange(field, null); }} className="text-slate-500 hover:text-red-400 transition-colors">
            <X size={14}/>
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-600/50 hover:border-violet-500/50 rounded-xl p-3 transition-all bg-slate-800/20">
          <div className={`grid gap-2 ${capture ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <button type="button" onClick={() => fileRef.current.click()}
              className="flex items-center justify-center gap-2 py-3 bg-slate-700/40 hover:bg-slate-700/80 rounded-lg text-slate-400 hover:text-white transition-all">
              <Upload size={14}/><span className="text-[10px] font-black uppercase">Upload</span>
            </button>
            {capture && (
              <button type="button" onClick={() => setCameraOpen(true)}
                className="flex items-center justify-center gap-2 py-3 bg-slate-700/40 hover:bg-violet-700/40 rounded-lg text-slate-400 hover:text-violet-300 transition-all">
                <Camera size={14}/><span className="text-[10px] font-black uppercase">Camera</span>
              </button>
            )}
          </div>
        </div>
      )}
      <input ref={fileRef} type="file" className="hidden" accept={accept}
        onChange={e => { if (e.target.files[0]) onChange(field, e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
}

// ── AI sidebar panel ──────────────────────────────────────────────────────────

function AIPanel({ scanning, fields, confidence }) {
  return (
    <div className="bg-violet-950/25 border border-violet-700/35 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain size={14} className="text-violet-400"/>
        <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">AI Scan</span>
        {scanning && <Loader2 size={10} className="animate-spin text-violet-400 ml-auto"/>}
        {!scanning && fields?.length > 0 && <Sparkles size={10} className="text-emerald-400 ml-auto"/>}
      </div>

      {scanning ? (
        <div className="space-y-3">
          <div className="h-1.5 bg-violet-900/50 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full w-3/5 animate-pulse"/>
          </div>
          <p className="text-[10px] text-slate-400">Analysing with Gemini AI…</p>
          {['Full name', 'Date of birth', 'Nationality', 'Document no.', 'Expiry'].map(f => (
            <div key={f} className="flex items-center gap-2 opacity-40">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shrink-0"/>
              <span className="text-[9px] text-slate-400">{f}</span>
            </div>
          ))}
        </div>
      ) : fields?.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-wider mb-3">✓ {fields.length} fields auto-filled</p>
          {fields.map(f => (
            <div key={f.key} className="flex items-center justify-between gap-2 py-1 border-b border-slate-700/25 last:border-0">
              <span className="text-[9px] text-slate-400 font-medium shrink-0">{f.label}</span>
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[9px] text-white font-bold truncate max-w-[70px]">{f.value}</span>
                <span className={`text-[7px] font-black px-1 py-0.5 rounded shrink-0 ${(f.confidence||0)>=0.8?'bg-emerald-900/60 text-emerald-400':(f.confidence||0)>=0.6?'bg-amber-900/60 text-amber-400':'bg-red-900/60 text-red-400'}`}>
                  {Math.round((f.confidence||0)*100)}%
                </span>
              </div>
            </div>
          ))}
          {confidence != null && (
            <div className="mt-3 pt-2 border-t border-slate-700/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-slate-400 font-black uppercase">Confidence</span>
                <span className={`text-[9px] font-black ${confidence>=0.8?'text-emerald-400':confidence>=0.6?'text-amber-400':'text-red-400'}`}>
                  {Math.round(confidence*100)}%
                </span>
              </div>
              <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${confidence>=0.8?'bg-emerald-500':confidence>=0.6?'bg-amber-500':'bg-red-500'}`}
                  style={{ width: `${confidence*100}%` }}/>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Upload your government-issued ID above — Gemini AI will automatically extract your name, date of birth, nationality, document number, and expiry date.
        </p>
      )}
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function KYCWizard({ session, profile, onComplete, triggerNotification }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [aiScanning, setAiScanning] = useState(false);
  const [aiFields, setAiFields] = useState([]);
  const [aiConfidence, setAiConfidence] = useState(null);
  const [preUploadedUrls, setPreUploadedUrls] = useState({});

  const [form, setForm] = useState({
    // Identity
    legal_first_name: profile?.full_legal_name?.split(' ')[0] || '',
    legal_middle_name: '',
    legal_last_name: profile?.full_legal_name?.split(' ').slice(-1)[0] || '',
    date_of_birth: profile?.dob || '',
    gender: '',
    nationality: '',
    dual_nationality: false,
    second_nationality: '',
    country_of_birth: '',
    city_of_birth: '',
    marital_status: '',
    number_of_dependents: '',
    primary_language: '',
    religion: '',
    // Contact
    phone_primary: profile?.phone || '',
    phone_secondary: '',
    email_primary: session?.user?.email || '',
    email_secondary: '',
    whatsapp_number: '',
    residential_address_line1: profile?.residential_address || '',
    residential_address_line2: '',
    residential_city: '',
    residential_state: '',
    residential_postal_code: '',
    residential_country: '',
    years_at_address: '',
    home_ownership: '',
    previous_address_1: '',
    years_at_previous_address_1: '',
    previous_address_2: '',
    years_at_previous_address_2: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    // Document
    id_type: '',
    id_number: '',
    id_expiry: '',
    id_issuing_country: '',
    id_issuing_authority: '',
    tax_id: profile?.tin || '',
    tin_per_country: {},
    // Financial
    employment_status: '',
    employer_name: profile?.employer || '',
    employer_address: '',
    job_title: '',
    industry: '',
    years_employed: '',
    monthly_income_usd: '',
    annual_income_usd: '',
    other_income_sources: '',
    other_income_amount_usd: '',
    total_net_worth_usd: '',
    liquid_assets_usd: '',
    real_estate_value_usd: '',
    crypto_holdings: false,
    existing_loans: false,
    total_debt_usd: '',
    source_of_funds: profile?.source_of_revenue || '',
    source_of_funds_details: '',
    expected_monthly_deposits_usd: '',
    expected_monthly_withdrawals_usd: '',
    expected_transaction_purpose: profile?.transaction_methods || '',
    purpose_of_account: '',
    // Compliance
    politically_exposed_person: false,
    pep_role: '',
    pep_country: '',
    criminal_record: false,
    criminal_record_details: '',
    fatca_applicable: false,
    fatca_w8ben_completed: false,
    fatca_w9_completed: false,
    crs_applicable: false,
    crs_self_certification_date: '',
    tax_residency_countries: [],
    investment_experience: '',
    risk_appetite: '',
    investment_horizon: '',
    regulatory_category: 'retail',
    investor_classification: 'retail',
    aml_terms_agreed: profile?.aml_terms_agreed || false,
    // Corporate
    is_corporate: false,
    company_legal_name: '',
    company_registration_number: '',
    company_registration_country: '',
    company_type: '',
    company_industry: '',
    ubo_full_name: '',
    ubo_nationality: '',
    ubo_ownership_percentage: '',
    ubo_declaration: '',
  });

  const [files, setFiles] = useState({
    id_front: null, id_back: null, selfie: null, selfie_with_id: null,
    proof_of_address: null, proof_of_income: null, bank_statement: null,
    tax_return: null, business_license: null, utility_bill: null,
    employment_letter: null, certificate_of_incorporation: null,
    board_resolution: null, ubo_id_document: null,
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setFile = (key, val) => setFiles(f => ({ ...f, [key]: val }));

  // Upload file — reuses pre-uploaded URL when possible
  const uploadFile = async (file, docType) => {
    if (!file) return null;
    if (preUploadedUrls[docType]) return preUploadedUrls[docType];
    const ext = file.name.split('.').pop();
    const path = `${session.user.id}/${docType}_${Date.now()}.${ext}`;
    setUploadProgress(p => ({ ...p, [docType]: 'uploading' }));
    const { error } = await supabase.storage.from('kyc_documents').upload(path, file);
    if (error) throw new Error(`Upload failed for ${docType}: ${error.message}`);
    const { data: { publicUrl } } = supabase.storage.from('kyc_documents').getPublicUrl(path);
    setUploadProgress(p => ({ ...p, [docType]: 'done' }));
    return publicUrl;
  };

  // When id_front is selected, upload immediately then call AI extraction
  const handleIdFrontChange = async (file) => {
    setFile('id_front', file);
    setAiFields([]);
    setAiConfidence(null);
    if (!file) return;

    setAiScanning(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${session.user.id}/id_front_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('kyc_documents').upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('kyc_documents').getPublicUrl(path);
      setPreUploadedUrls(p => ({ ...p, id_front: publicUrl }));

      const { data, error: aiErr } = await supabase.functions.invoke('kyc-ai-extract', {
        body: { document_url: publicUrl, document_type: 'id_front' }
      });
      if (aiErr) throw aiErr;

      // Map AI response → form fields
      const extracted = data?.extracted_fields || data?.fields || {};
      const confs = data?.field_confidences || {};
      const filled = [];
      const MAP = {
        first_name:      ['legal_first_name', 'First Name'],
        last_name:       ['legal_last_name',  'Last Name'],
        middle_name:     ['legal_middle_name','Middle Name'],
        date_of_birth:   ['date_of_birth',    'Date of Birth'],
        nationality:     ['nationality',      'Nationality'],
        gender:          ['gender',           'Gender'],
        id_number:       ['id_number',        'ID Number'],
        expiry_date:     ['id_expiry',        'Expiry Date'],
        issuing_country: ['id_issuing_country','Issuing Country'],
        country_of_birth:['country_of_birth', 'Country of Birth'],
      };
      Object.entries(MAP).forEach(([aiKey, [formKey, displayLabel]]) => {
        const val = extracted[aiKey];
        if (val) {
          setForm(f => ({ ...f, [formKey]: val }));
          filled.push({ key: formKey, label: displayLabel, value: val, confidence: confs[aiKey] ?? data?.confidence ?? 0.8 });
        }
      });
      setAiFields(filled);
      setAiConfidence(data?.confidence ?? data?.overall_confidence ?? null);
    } catch (_) {
      // Silent — AI is best-effort
    } finally {
      setAiScanning(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.aml_terms_agreed) {
      triggerNotification('error', 'You must accept the AML/CTF declaration to proceed.');
      return;
    }
    setSubmitting(true);
    try {
      const userId = session.user.id;
      const [
        id_front_url, id_back_url, selfie_url, selfie_with_id_url,
        proof_of_address_url, proof_of_income_url, bank_statement_url,
        tax_return_url, business_license_url, employment_letter_url,
        certificate_of_incorporation_url, board_resolution_url, ubo_id_document_url,
      ] = await Promise.all([
        uploadFile(files.id_front,                 'id_front'),
        uploadFile(files.id_back,                  'id_back'),
        uploadFile(files.selfie,                   'selfie'),
        uploadFile(files.selfie_with_id,           'selfie_with_id'),
        uploadFile(files.proof_of_address,         'proof_of_address'),
        uploadFile(files.proof_of_income,          'proof_of_income'),
        uploadFile(files.bank_statement,           'bank_statement'),
        uploadFile(files.tax_return,               'tax_return'),
        uploadFile(files.business_license,         'business_license'),
        uploadFile(files.employment_letter,        'employment_letter'),
        uploadFile(files.certificate_of_incorporation, 'certificate_of_incorporation'),
        uploadFile(files.board_resolution,         'board_resolution'),
        uploadFile(files.ubo_id_document,          'ubo_id_document'),
      ]);

      const submission = {
        user_id: userId,
        status: 'ai_reviewing',
        legal_first_name: form.legal_first_name,
        legal_middle_name: form.legal_middle_name,
        legal_last_name: form.legal_last_name,
        legal_full_name: `${form.legal_first_name} ${form.legal_middle_name} ${form.legal_last_name}`.replace(/\s+/g,' ').trim(),
        date_of_birth: form.date_of_birth || null,
        gender: form.gender,
        nationality: form.nationality,
        dual_nationality: form.dual_nationality,
        second_nationality: form.second_nationality || null,
        country_of_birth: form.country_of_birth,
        city_of_birth: form.city_of_birth,
        marital_status: form.marital_status,
        number_of_dependents: form.number_of_dependents ? parseInt(form.number_of_dependents) : null,
        primary_language: form.primary_language,
        phone_primary: form.phone_primary,
        phone_secondary: form.phone_secondary || null,
        email_primary: form.email_primary,
        email_secondary: form.email_secondary || null,
        whatsapp_number: form.whatsapp_number || null,
        residential_address_line1: form.residential_address_line1,
        residential_address_line2: form.residential_address_line2 || null,
        residential_city: form.residential_city,
        residential_state: form.residential_state,
        residential_postal_code: form.residential_postal_code,
        residential_country: form.residential_country,
        years_at_address: form.years_at_address ? parseInt(form.years_at_address) : null,
        home_ownership: form.home_ownership,
        previous_address_1: form.previous_address_1 || null,
        years_at_previous_address_1: form.years_at_previous_address_1 ? parseInt(form.years_at_previous_address_1) : null,
        previous_address_2: form.previous_address_2 || null,
        years_at_previous_address_2: form.years_at_previous_address_2 ? parseInt(form.years_at_previous_address_2) : null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        emergency_contact_relationship: form.emergency_contact_relationship || null,
        id_type: form.id_type,
        id_number: form.id_number,
        id_expiry: form.id_expiry || null,
        id_issuing_country: form.id_issuing_country,
        id_issuing_authority: form.id_issuing_authority || null,
        tax_id: form.tax_id || null,
        tin_per_country: form.tin_per_country,
        employment_status: form.employment_status,
        employer_name: form.employer_name,
        employer_address: form.employer_address || null,
        job_title: form.job_title,
        industry: form.industry,
        years_employed: form.years_employed ? parseInt(form.years_employed) : null,
        monthly_income_usd: form.monthly_income_usd ? parseFloat(form.monthly_income_usd) : null,
        annual_income_usd: form.annual_income_usd ? parseFloat(form.annual_income_usd) : null,
        other_income_sources: form.other_income_sources || null,
        other_income_amount_usd: form.other_income_amount_usd ? parseFloat(form.other_income_amount_usd) : null,
        total_net_worth_usd: form.total_net_worth_usd ? parseFloat(form.total_net_worth_usd) : null,
        liquid_assets_usd: form.liquid_assets_usd ? parseFloat(form.liquid_assets_usd) : null,
        real_estate_value_usd: form.real_estate_value_usd ? parseFloat(form.real_estate_value_usd) : null,
        crypto_holdings: form.crypto_holdings,
        existing_loans: form.existing_loans,
        total_debt_usd: form.total_debt_usd ? parseFloat(form.total_debt_usd) : null,
        source_of_funds: form.source_of_funds,
        source_of_funds_details: form.source_of_funds_details || null,
        expected_monthly_deposits_usd: form.expected_monthly_deposits_usd ? parseFloat(form.expected_monthly_deposits_usd) : null,
        expected_monthly_withdrawals_usd: form.expected_monthly_withdrawals_usd ? parseFloat(form.expected_monthly_withdrawals_usd) : null,
        expected_transaction_purpose: form.expected_transaction_purpose,
        purpose_of_account: form.purpose_of_account || null,
        politically_exposed_person: form.politically_exposed_person,
        pep_role: form.pep_role || null,
        pep_country: form.pep_country || null,
        criminal_record: form.criminal_record,
        criminal_record_details: form.criminal_record_details || null,
        fatca_applicable: form.fatca_applicable,
        fatca_w8ben_completed: form.fatca_w8ben_completed,
        fatca_w9_completed: form.fatca_w9_completed,
        crs_applicable: form.crs_applicable,
        crs_self_certification_date: form.crs_self_certification_date || null,
        tax_residency_countries: form.tax_residency_countries,
        investment_experience: form.investment_experience || null,
        risk_appetite: form.risk_appetite || null,
        investment_horizon: form.investment_horizon || null,
        regulatory_category: form.regulatory_category,
        investor_classification: form.investor_classification,
        is_corporate: form.is_corporate,
        company_legal_name: form.company_legal_name || null,
        company_registration_number: form.company_registration_number || null,
        company_registration_country: form.company_registration_country || null,
        company_type: form.company_type || null,
        company_industry: form.company_industry || null,
        ubo_full_name: form.ubo_full_name || null,
        ubo_nationality: form.ubo_nationality || null,
        ubo_ownership_percentage: form.ubo_ownership_percentage ? parseFloat(form.ubo_ownership_percentage) : null,
        ubo_declaration: form.ubo_declaration || null,
        id_front_url, id_back_url, selfie_url, selfie_with_id_url,
        proof_of_address_url, proof_of_income_url, bank_statement_url,
        tax_return_url, business_license_url, employment_letter_url,
        certificate_of_incorporation_url, board_resolution_url, ubo_id_document_url,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: subErr } = await supabase.from('kyc_submissions')
        .upsert([submission], { onConflict: 'user_id' });
      if (subErr) throw new Error(subErr.message);

      await supabase.from('profiles').update({
        kyc_status: 'pending_kyc',
        full_legal_name: submission.legal_full_name,
        dob: form.date_of_birth || null,
        phone: form.phone_primary,
        residential_address: form.residential_address_line1,
        operational_address: form.residential_address_line1,
        source_of_revenue: form.source_of_funds,
        employer: form.employer_name,
        transaction_methods: form.expected_transaction_purpose,
        aml_terms_agreed: true,
      }).eq('id', userId);

      if (selfie_with_id_url || selfie_url) {
        supabase.functions.invoke('kyc-ai-extract', {
          body: { document_url: selfie_with_id_url || selfie_url, document_type: selfie_with_id_url ? 'selfie_with_id' : 'selfie' }
        }).catch(() => {});
      }

      triggerNotification('success', 'KYC submitted. Our AI compliance team reviews within 24–48 hours.');
      onComplete?.();
    } catch (err) {
      triggerNotification('error', err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step renderers ──────────────────────────────────────────────────────────

  const renderPersonal = () => (
    <div className="space-y-4">
      <Sect icon={User} title="Legal Identity" />
      <div className="grid grid-cols-3 gap-3">
        <Field label="First Name *"><input className={inp} value={form.legal_first_name} onChange={e => set('legal_first_name', e.target.value)} placeholder="As on ID"/></Field>
        <Field label="Middle Name"><input className={inp} value={form.legal_middle_name} onChange={e => set('legal_middle_name', e.target.value)} placeholder="If applicable"/></Field>
        <Field label="Last Name *"><input className={inp} value={form.legal_last_name} onChange={e => set('legal_last_name', e.target.value)} placeholder="As on ID"/></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of Birth *"><input type="date" className={inp} value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)}/></Field>
        <Field label="Gender">
          <select className={sel} value={form.gender} onChange={e => set('gender', e.target.value)}>
            <option value="">Select</option><option>Male</option><option>Female</option><option>Non-binary</option><option>Prefer not to say</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Primary Nationality *"><input className={inp} value={form.nationality} onChange={e => set('nationality', e.target.value)} placeholder="Country"/></Field>
        <Field label="Country of Birth"><input className={inp} value={form.country_of_birth} onChange={e => set('country_of_birth', e.target.value)} placeholder="Country"/></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Marital Status">
          <select className={sel} value={form.marital_status} onChange={e => set('marital_status', e.target.value)}>
            <option value="">Select</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
          </select>
        </Field>
        <Field label="Primary Language"><input className={inp} value={form.primary_language} onChange={e => set('primary_language', e.target.value)} placeholder="e.g. English"/></Field>
      </div>
      <Toggle id="dual" checked={form.dual_nationality} onChange={e => set('dual_nationality', e.target.checked)}>
        I hold dual / multiple nationalities
      </Toggle>
      {form.dual_nationality && (
        <Field label="Second Nationality"><input className={inp} value={form.second_nationality} onChange={e => set('second_nationality', e.target.value)}/></Field>
      )}

      <Sect icon={MapPin} title="Contact Information" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Primary Phone *"><input type="tel" className={inp} value={form.phone_primary} onChange={e => set('phone_primary', e.target.value)} placeholder="+1 555 000 0000"/></Field>
        <Field label="WhatsApp"><input type="tel" className={inp} value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)} placeholder="+1 555 000 0000"/></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email (Primary)"><input type="email" className={inp} value={form.email_primary} readOnly/></Field>
        <Field label="Email (Secondary)"><input type="email" className={inp} value={form.email_secondary} onChange={e => set('email_secondary', e.target.value)} placeholder="Optional"/></Field>
      </div>

      <Sect icon={MapPin} title="Residential Address" />
      <Field label="Address Line 1 *"><input className={inp} value={form.residential_address_line1} onChange={e => set('residential_address_line1', e.target.value)} placeholder="Street address"/></Field>
      <Field label="Address Line 2"><input className={inp} value={form.residential_address_line2} onChange={e => set('residential_address_line2', e.target.value)} placeholder="Apt, suite (optional)"/></Field>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="City *"><input className={inp} value={form.residential_city} onChange={e => set('residential_city', e.target.value)}/></Field>
        <Field label="State / Region"><input className={inp} value={form.residential_state} onChange={e => set('residential_state', e.target.value)}/></Field>
        <Field label="Postal Code"><input className={inp} value={form.residential_postal_code} onChange={e => set('residential_postal_code', e.target.value)}/></Field>
        <Field label="Country *"><input className={inp} value={form.residential_country} onChange={e => set('residential_country', e.target.value)}/></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Years at This Address"><input type="number" className={inp} min="0" value={form.years_at_address} onChange={e => set('years_at_address', e.target.value)}/></Field>
        <Field label="Home Ownership">
          <select className={sel} value={form.home_ownership} onChange={e => set('home_ownership', e.target.value)}>
            <option value="">Select</option><option value="owned">Owned</option><option value="rented">Rented</option><option value="family">Family / Shared</option><option value="other">Other</option>
          </select>
        </Field>
      </div>
    </div>
  );

  const renderScan = () => (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: doc details + uploads */}
      <div className="lg:col-span-3 space-y-4">
        <Sect icon={FileText} title="ID Document Details" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Document Type *">
            <select className={sel} value={form.id_type} onChange={e => set('id_type', e.target.value)}>
              <option value="">Select</option>
              <option value="passport">Passport</option>
              <option value="national_id">National ID Card</option>
              <option value="drivers_license">Driver's Licence</option>
              <option value="residence_permit">Residence Permit</option>
            </select>
          </Field>
          <Field label="Document Number *"><input className={inp} value={form.id_number} onChange={e => set('id_number', e.target.value)} placeholder="As printed on ID"/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expiry Date">
            <input type="date" className={inp} value={form.id_expiry} onChange={e => {
              const val = e.target.value;
              if (val && new Date(val) < new Date()) {
                e.target.setCustomValidity('ID document is expired. Please use a valid document.');
                e.target.reportValidity();
              } else {
                e.target.setCustomValidity('');
              }
              set('id_expiry', val);
            }}/>
          </Field>
          <Field label="Issuing Country"><input className={inp} value={form.id_issuing_country} onChange={e => set('id_issuing_country', e.target.value)}/></Field>
        </div>
        <Field label="Issuing Authority"><input className={inp} value={form.id_issuing_authority} onChange={e => set('id_issuing_authority', e.target.value)} placeholder="e.g. Home Affairs, DVLA, State Dept"/></Field>
        <Field label="Tax ID / TIN / SSN"><input className={inp} value={form.tax_id} onChange={e => set('tax_id', e.target.value)} placeholder="Home country tax number"/></Field>

        <Sect icon={Camera} title="Document Capture — AI Auto-Fill" />
        <div className="bg-violet-950/15 border border-violet-700/25 rounded-xl px-3 py-2 text-[10px] text-violet-300 font-medium">
          Upload or photograph your ID — Gemini AI reads it instantly and fills your details on step 1.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DocZone label="Government ID — Front" field="id_front" files={files}
            onChange={(field, file) => { if (field === 'id_front') handleIdFrontChange(file); else setFile(field, file); }}
            required capture />
          <DocZone label="Government ID — Back" field="id_back" files={files} onChange={setFile} capture />
        </div>

        <Sect icon={ScanFace} title="Selfie Verification" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DocZone label="Selfie — Face Only" field="selfie" files={files} onChange={setFile} accept="image/*" capture />
          <DocZone label="Selfie Holding ID" field="selfie_with_id" files={files} onChange={setFile} accept="image/*" capture required />
        </div>
        <div className="bg-blue-950/20 border border-blue-700/30 rounded-xl p-3">
          <p className="text-[9px] font-black uppercase tracking-wider text-blue-400 mb-1">Selfie tips</p>
          <ul className="text-[9px] text-slate-400 space-y-0.5 list-disc list-inside">
            <li>Face fully visible, good lighting, no sunglasses</li>
            <li>Hold your ID next to your face — all text must be readable</li>
            <li>Plain or neutral background preferred</li>
          </ul>
        </div>
      </div>

      {/* Right: AI panel (sticky on desktop) */}
      <div className="lg:col-span-2">
        <div className="lg:sticky lg:top-4 space-y-3">
          <AIPanel scanning={aiScanning} fields={aiFields} confidence={aiConfidence} />
          {aiFields.length > 0 && (
            <div className="bg-emerald-950/20 border border-emerald-700/30 rounded-xl p-3">
              <p className="text-[9px] font-black text-emerald-400 uppercase mb-1">Step 1 auto-filled</p>
              <p className="text-[9px] text-slate-400">Navigate back to verify AI-extracted values before continuing.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderFinances = () => (
    <div className="space-y-4">
      <Sect icon={Briefcase} title="Employment" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Employment Status *">
          <select className={sel} value={form.employment_status} onChange={e => set('employment_status', e.target.value)}>
            <option value="">Select</option>
            <option value="employed">Employed (Full-Time)</option>
            <option value="employed_part">Employed (Part-Time)</option>
            <option value="self_employed">Self-Employed / Business Owner</option>
            <option value="student">Student</option>
            <option value="retired">Retired</option>
            <option value="unemployed">Unemployed</option>
          </select>
        </Field>
        <Field label="Industry / Sector"><input className={inp} value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="e.g. Finance, Tech, Healthcare"/></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Employer Name"><input className={inp} value={form.employer_name} onChange={e => set('employer_name', e.target.value)}/></Field>
        <Field label="Job Title"><input className={inp} value={form.job_title} onChange={e => set('job_title', e.target.value)}/></Field>
      </div>

      <Sect icon={DollarSign} title="Income" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Monthly Income (USD)"><input type="number" className={inp} min="0" value={form.monthly_income_usd} onChange={e => set('monthly_income_usd', e.target.value)}/></Field>
        <Field label="Annual Income (USD)"><input type="number" className={inp} min="0" value={form.annual_income_usd} onChange={e => set('annual_income_usd', e.target.value)}/></Field>
      </div>
      <Field label="Other Income Sources"><input className={inp} value={form.other_income_sources} onChange={e => set('other_income_sources', e.target.value)} placeholder="e.g. rental income, dividends, freelance"/></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Primary Source of Funds *">
          <select className={sel} value={form.source_of_funds} onChange={e => set('source_of_funds', e.target.value)}>
            <option value="">Select</option>
            <option value="salary">Salary / Employment</option>
            <option value="business">Business Revenue</option>
            <option value="investment">Investment Returns</option>
            <option value="inheritance">Inheritance</option>
            <option value="savings">Personal Savings</option>
            <option value="property">Property Sale</option>
            <option value="pension">Pension / Retirement</option>
          </select>
        </Field>
        <Field label="Purpose of Account *">
          <select className={sel} value={form.purpose_of_account} onChange={e => set('purpose_of_account', e.target.value)}>
            <option value="">Select</option>
            <option value="personal_savings">Personal Savings</option>
            <option value="business_operations">Business Operations</option>
            <option value="international_transfers">International Transfers</option>
            <option value="investments">Investments</option>
            <option value="salary_receipt">Salary Receipt</option>
            <option value="remittance">Family Remittance</option>
          </select>
        </Field>
      </div>
      <Field label="Source of Funds Details">
        <textarea className={inp} rows={2} value={form.source_of_funds_details} onChange={e => set('source_of_funds_details', e.target.value)} placeholder="Briefly describe how you acquired your funds"/>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Expected Monthly Deposits (USD)"><input type="number" className={inp} min="0" value={form.expected_monthly_deposits_usd} onChange={e => set('expected_monthly_deposits_usd', e.target.value)}/></Field>
        <Field label="Expected Monthly Withdrawals (USD)"><input type="number" className={inp} min="0" value={form.expected_monthly_withdrawals_usd} onChange={e => set('expected_monthly_withdrawals_usd', e.target.value)}/></Field>
      </div>
      <Field label="Expected Transaction Types"><input className={inp} value={form.expected_transaction_purpose} onChange={e => set('expected_transaction_purpose', e.target.value)} placeholder="e.g. wire transfers, P2P, crypto purchases"/></Field>

      <Sect icon={Globe} title="Wealth & Assets" />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Net Worth (USD)"><input type="number" className={inp} min="0" value={form.total_net_worth_usd} onChange={e => set('total_net_worth_usd', e.target.value)}/></Field>
        <Field label="Liquid Assets (USD)"><input type="number" className={inp} min="0" value={form.liquid_assets_usd} onChange={e => set('liquid_assets_usd', e.target.value)}/></Field>
        <Field label="Real Estate (USD)"><input type="number" className={inp} min="0" value={form.real_estate_value_usd} onChange={e => set('real_estate_value_usd', e.target.value)}/></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Toggle id="crypto" checked={form.crypto_holdings} onChange={e => set('crypto_holdings', e.target.checked)}>I hold cryptocurrency assets</Toggle>
        <Toggle id="loans" checked={form.existing_loans} onChange={e => set('existing_loans', e.target.checked)}>I have existing loans or outstanding debt</Toggle>
      </div>
      {form.existing_loans && (
        <Field label="Total Outstanding Debt (USD)"><input type="number" className={inp} min="0" value={form.total_debt_usd} onChange={e => set('total_debt_usd', e.target.value)}/></Field>
      )}
    </div>
  );

  const renderCompliance = () => (
    <div className="space-y-4">
      <Sect icon={AlertTriangle} title="PEP & Sanctions Declarations" />
      <Toggle id="pep" checked={form.politically_exposed_person} onChange={e => set('politically_exposed_person', e.target.checked)} color="amber">
        I am or have been a Politically Exposed Person (PEP) — a current or former government official, politician, military officer, or judicial figure, or a close associate / family member of one.
      </Toggle>
      {form.politically_exposed_person && (
        <div className="grid grid-cols-2 gap-3 pl-3">
          <Field label="PEP Role / Position"><input className={inp} value={form.pep_role} onChange={e => set('pep_role', e.target.value)} placeholder="e.g. Minister of Finance"/></Field>
          <Field label="PEP Country"><input className={inp} value={form.pep_country} onChange={e => set('pep_country', e.target.value)}/></Field>
        </div>
      )}
      <Toggle id="criminal" checked={form.criminal_record} onChange={e => set('criminal_record', e.target.checked)} color="red">
        I have a criminal record or am subject to criminal proceedings.
      </Toggle>
      {form.criminal_record && (
        <Field label="Details">
          <textarea className={inp} rows={2} value={form.criminal_record_details} onChange={e => set('criminal_record_details', e.target.value)} placeholder="Provide details"/>
        </Field>
      )}

      <Sect icon={Globe} title="FATCA / CRS Tax Compliance" />
      <Toggle id="fatca" checked={form.fatca_applicable} onChange={e => set('fatca_applicable', e.target.checked)} color="blue">
        I am a US Person (US citizen, Green Card holder, or US tax resident) — FATCA applies.
      </Toggle>
      {form.fatca_applicable && (
        <div className="grid grid-cols-2 gap-3 pl-3">
          <Toggle id="w8ben" checked={form.fatca_w8ben_completed} onChange={e => set('fatca_w8ben_completed', e.target.checked)} color="blue">W-8BEN completed (non-US income)</Toggle>
          <Toggle id="w9" checked={form.fatca_w9_completed} onChange={e => set('fatca_w9_completed', e.target.checked)} color="blue">W-9 completed (US persons)</Toggle>
        </div>
      )}
      <Toggle id="crs" checked={form.crs_applicable} onChange={e => set('crs_applicable', e.target.checked)}>
        I am tax resident in a country participating in the OECD Common Reporting Standard (CRS) exchange.
      </Toggle>
      {form.crs_applicable && (
        <Field label="CRS Self-Certification Date"><input type="date" className={inp} value={form.crs_self_certification_date} onChange={e => set('crs_self_certification_date', e.target.value)}/></Field>
      )}

      <Sect icon={Briefcase} title="Investor Profile" />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Investment Experience">
          <select className={sel} value={form.investment_experience} onChange={e => set('investment_experience', e.target.value)}>
            <option value="">Select</option><option value="none">None</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="expert">Expert</option>
          </select>
        </Field>
        <Field label="Risk Appetite">
          <select className={sel} value={form.risk_appetite} onChange={e => set('risk_appetite', e.target.value)}>
            <option value="">Select</option><option value="conservative">Conservative</option><option value="moderate">Moderate</option><option value="aggressive">Aggressive</option>
          </select>
        </Field>
        <Field label="Investment Horizon">
          <select className={sel} value={form.investment_horizon} onChange={e => set('investment_horizon', e.target.value)}>
            <option value="">Select</option><option value="short">Short (&lt;2 yrs)</option><option value="medium">Medium (2–7 yrs)</option><option value="long">Long (&gt;7 yrs)</option>
          </select>
        </Field>
      </div>

      <Sect icon={Building2} title="Corporate KYC" />
      <Toggle id="is_corp" checked={form.is_corporate} onChange={e => set('is_corporate', e.target.checked)}>
        This account is for a company / corporate entity
      </Toggle>
      {form.is_corporate && (
        <div className="space-y-4 pl-3 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Legal Company Name *"><input className={inp} value={form.company_legal_name} onChange={e => set('company_legal_name', e.target.value)}/></Field>
            <Field label="Registration Number *"><input className={inp} value={form.company_registration_number} onChange={e => set('company_registration_number', e.target.value)}/></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Country of Registration"><input className={inp} value={form.company_registration_country} onChange={e => set('company_registration_country', e.target.value)}/></Field>
            <Field label="Company Type">
              <select className={sel} value={form.company_type} onChange={e => set('company_type', e.target.value)}>
                <option value="">Select</option><option>LLC</option><option>Corporation</option><option>Partnership</option><option>Sole Trader</option><option>NGO / NPO</option><option>Trust</option><option>Other</option>
              </select>
            </Field>
          </div>
          <Field label="Business Activity"><input className={inp} value={form.company_industry} onChange={e => set('company_industry', e.target.value)}/></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="UBO Full Name"><input className={inp} value={form.ubo_full_name} onChange={e => set('ubo_full_name', e.target.value)}/></Field>
            <Field label="UBO Nationality"><input className={inp} value={form.ubo_nationality} onChange={e => set('ubo_nationality', e.target.value)}/></Field>
            <Field label="UBO Ownership %"><input type="number" className={inp} min="0" max="100" value={form.ubo_ownership_percentage} onChange={e => set('ubo_ownership_percentage', e.target.value)}/></Field>
          </div>
        </div>
      )}
    </div>
  );

  const renderSubmitStep = () => (
    <div className="space-y-4">
      <Sect icon={Upload} title="Supporting Documents" />
      <div className="grid grid-cols-2 gap-3">
        <DocZone label="Proof of Address" field="proof_of_address" files={files} onChange={setFile} required capture />
        <DocZone label="Bank Statement (3 months)" field="bank_statement" files={files} onChange={setFile} capture />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DocZone label="Proof of Income / Payslip" field="proof_of_income" files={files} onChange={setFile} capture />
        <DocZone label="Tax Return / Certificate" field="tax_return" files={files} onChange={setFile} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DocZone label="Employment Letter" field="employment_letter" files={files} onChange={setFile} />
        <DocZone label="Utility Bill (Optional)" field="utility_bill" files={files} onChange={setFile} />
      </div>
      {form.is_corporate && (
        <>
          <Sect icon={Building2} title="Corporate Documents" />
          <div className="grid grid-cols-2 gap-3">
            <DocZone label="Certificate of Incorporation" field="certificate_of_incorporation" files={files} onChange={setFile} required />
            <DocZone label="Board Resolution" field="board_resolution" files={files} onChange={setFile} />
          </div>
          <DocZone label="UBO Government ID" field="ubo_id_document" files={files} onChange={setFile} required capture />
        </>
      )}
      <p className="text-[9px] text-slate-500 mt-1">Proof of address must be dated within the last 90 days. Max 10 MB per file. JPG / PNG / PDF / HEIC accepted.</p>

      <Sect icon={CheckCircle2} title="Review Summary" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {[
          { label: 'Full Name', val: `${form.legal_first_name} ${form.legal_last_name}`.trim() || '—' },
          { label: 'Date of Birth', val: form.date_of_birth || '—' },
          { label: 'Nationality', val: form.nationality || '—' },
          { label: 'ID Type', val: form.id_type || '—' },
          { label: 'ID Number', val: form.id_number || '—' },
          { label: 'Country', val: form.residential_country || '—' },
          { label: 'Phone', val: form.phone_primary || '—' },
          { label: 'Employment', val: form.employment_status || '—' },
          { label: 'Source of Funds', val: form.source_of_funds || '—' },
          { label: 'PEP', val: form.politically_exposed_person ? 'YES ⚠️' : 'No' },
          { label: 'FATCA', val: form.fatca_applicable ? 'Applicable' : 'N/A' },
          { label: 'Documents', val: `${Object.values(files).filter(Boolean).length} uploaded` },
        ].map(({ label, val }) => (
          <div key={label} className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</p>
            <p className="text-xs font-bold text-white mt-0.5 truncate">{val}</p>
          </div>
        ))}
      </div>

      {/* Upload progress indicator */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-1.5 bg-slate-800/30 border border-slate-700/30 rounded-xl p-3">
          {Object.entries(uploadProgress).map(([doc, status]) => (
            <div key={doc} className="flex items-center gap-2">
              {status === 'uploading' ? <Loader2 size={10} className="animate-spin text-violet-400 shrink-0"/> : <CheckCircle2 size={10} className="text-emerald-400 shrink-0"/>}
              <span className="text-[9px] font-bold text-slate-400 flex-1 capitalize">{doc.replace(/_/g,' ')}</span>
              <span className={`text-[8px] font-black ${status === 'done' ? 'text-emerald-400' : 'text-violet-400'}`}>{status}</span>
            </div>
          ))}
        </div>
      )}

      {/* AML Declaration */}
      <div className="bg-slate-800/40 border border-slate-600/40 rounded-2xl p-5">
        <h4 className="font-black text-white text-sm mb-3 flex items-center gap-2">
          <Shield size={14} className="text-violet-400"/> AML / CTF Declaration
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">
          I hereby declare that all information provided in this application is true, accurate, and complete to the best of my knowledge. I understand that providing false information is a criminal offence under applicable AML/CTF regulations. I consent to IFB performing background checks, sanctions screening, and periodic KYC reviews as required by FATF, FATCA, CRS, and applicable local regulations. I authorise IFB to verify my identity, address, and financial information with third-party providers, credit bureaus, and government databases. I acknowledge that my account may be suspended pending investigation if suspicious activity is detected.
        </p>
        <div className="flex items-start gap-3 bg-violet-950/30 border border-violet-700/40 rounded-xl p-4">
          <input type="checkbox" id="aml_agree" checked={form.aml_terms_agreed} onChange={e => set('aml_terms_agreed', e.target.checked)}
            className="w-5 h-5 accent-violet-500 mt-0.5 shrink-0 cursor-pointer"/>
          <label htmlFor="aml_agree" className="text-xs font-black text-slate-300 cursor-pointer leading-relaxed">
            I have read and agree to the AML/CTF declaration, Terms of Service, and Privacy Policy. I consent to identity verification and ongoing monitoring.
          </label>
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (STEPS[step].id) {
      case 'personal':   return renderPersonal();
      case 'scan':       return renderScan();
      case 'finances':   return renderFinances();
      case 'compliance': return renderCompliance();
      case 'submit':     return renderSubmitStep();
      default: return null;
    }
  };

  // ── Layout ──────────────────────────────────────────────────────────────────

  const S = STEPS[step];
  const progressPct = (step / (STEPS.length - 1)) * 100;

  return (
    <div className="space-y-6">

      {/* ── Step indicator ── */}
      <div className="relative">
        {/* connecting track */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-slate-700/70">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-violet-600 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}/>
        </div>
        <div className="relative z-10 flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done   = i < step;
            const active = i === step;
            return (
              <button key={s.id} type="button" onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={`flex flex-col items-center gap-1.5 group ${i <= step ? 'cursor-pointer' : 'cursor-default'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${done ? 'bg-emerald-500 border-emerald-400 shadow-md shadow-emerald-500/30' : active ? 'bg-violet-600 border-violet-400 shadow-lg shadow-violet-500/40 scale-110' : 'bg-slate-800 border-slate-600'}`}>
                  {done
                    ? <CheckCheck size={15} className="text-white"/>
                    : <Icon size={15} className={active ? 'text-white' : 'text-slate-500'}/>
                  }
                </div>
                <span className={`text-[8px] font-black uppercase tracking-widest hidden sm:block whitespace-nowrap transition-colors ${active ? 'text-violet-400' : done ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Step title ── */}
      <div>
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <S.icon size={18} className="text-violet-400"/>
          {S.label}
        </h3>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{S.hint}</p>
      </div>

      {/* ── Step content ── */}
      <div>{renderStep()}</div>

      {/* ── Navigation ── */}
      <div className="flex justify-between items-center border-t border-slate-700/40 pt-5">
        <button type="button" onClick={() => setStep(s => Math.max(s - 1, 0))} disabled={step === 0}
          className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-30 border border-slate-700/50">
          <ChevronLeft size={14}/> Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600 font-bold hidden sm:block">{step + 1} / {STEPS.length}</span>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStep(s => Math.min(s + 1, STEPS.length - 1))}
              className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-violet-900/40">
              Continue <ChevronRight size={14}/>
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={submitting || !form.aml_terms_agreed}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-900/40 disabled:opacity-50">
              {submitting
                ? <><Loader2 size={14} className="animate-spin"/> Submitting…</>
                : <><ShieldCheck size={14}/> Submit KYC</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
