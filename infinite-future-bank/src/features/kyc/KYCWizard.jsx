import { useState, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  User, MapPin, Briefcase, Shield, Building2, FileText,
  CheckCircle2, ChevronRight, ChevronLeft, Upload, Loader2,
  Globe, DollarSign, AlertTriangle, ShieldCheck, X, Eye
} from 'lucide-react';

const STEPS = [
  { id: 'identity',    label: 'Personal Identity',   icon: User },
  { id: 'address',     label: 'Contact & Address',   icon: MapPin },
  { id: 'document',    label: 'ID Document',         icon: FileText },
  { id: 'financial',   label: 'Financial Profile',   icon: DollarSign },
  { id: 'compliance',  label: 'AML / Compliance',    icon: Shield },
  { id: 'corporate',   label: 'Corporate KYC',       icon: Building2 },
  { id: 'documents',   label: 'Upload Documents',    icon: Upload },
  { id: 'review',      label: 'Review & Submit',     icon: CheckCircle2 },
];

const inp = 'w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-500 transition-all placeholder:text-slate-400';
const sel = inp + ' cursor-pointer';
const lbl = 'block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1';
const sect = 'space-y-4';
const secth = 'text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-slate-100 pb-2';

function Field({ label, children }) {
  return <div><label className={lbl}>{label}</label>{children}</div>;
}

function DocUpload({ label, field, files, onChange, accept = 'image/*,application/pdf' }) {
  const ref = useRef();
  const file = files[field];
  return (
    <div>
      <label className={lbl}>{label}</label>
      <button type="button" onClick={() => ref.current.click()}
        className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-4 flex items-center justify-between gap-3 transition-all">
        <div className="flex items-center gap-3 min-w-0">
          <Upload size={16} className={file ? 'text-emerald-500' : 'text-slate-400'} />
          <span className={`text-xs font-bold truncate ${file ? 'text-emerald-600' : 'text-slate-400'}`}>
            {file ? file.name : 'Click to upload'}
          </span>
        </div>
        {file && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
      </button>
      <input ref={ref} type="file" className="hidden" accept={accept}
        onChange={e => { if (e.target.files[0]) onChange(field, e.target.files[0]); }} />
    </div>
  );
}

export default function KYCWizard({ session, profile, onComplete, triggerNotification }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const [form, setForm] = useState({
    // Step 1 — Identity
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
    // Step 2 — Address
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
    // Step 3 — Document
    id_type: '',
    id_number: '',
    id_expiry: '',
    id_issuing_country: '',
    id_issuing_authority: '',
    tax_id: profile?.tin || '',
    tin_per_country: {},
    // Step 4 — Financial
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
    // Step 5 — Compliance
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
    // Step 6 — Corporate
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
  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const uploadFile = async (file, docType) => {
    if (!file) return null;
    const ext = file.name.split('.').pop();
    const path = `${session.user.id}/${docType}_${Date.now()}.${ext}`;
    setUploadProgress(p => ({ ...p, [docType]: 'uploading' }));
    const { error } = await supabase.storage.from('kyc_documents').upload(path, file);
    if (error) throw new Error(`Upload failed for ${docType}: ${error.message}`);
    const { data: { publicUrl } } = supabase.storage.from('kyc_documents').getPublicUrl(path);
    setUploadProgress(p => ({ ...p, [docType]: 'done' }));
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!form.aml_terms_agreed) {
      triggerNotification('error', 'You must accept the AML/CTF declaration to proceed.');
      return;
    }
    setSubmitting(true);
    try {
      const userId = session.user.id;

      // Upload all documents in parallel
      const [
        id_front_url, id_back_url, selfie_url, selfie_with_id_url,
        proof_of_address_url, proof_of_income_url, bank_statement_url,
        tax_return_url, business_license_url, employment_letter_url,
        certificate_of_incorporation_url, board_resolution_url, ubo_id_document_url,
      ] = await Promise.all([
        uploadFile(files.id_front, 'id_front'),
        uploadFile(files.id_back, 'id_back'),
        uploadFile(files.selfie, 'selfie'),
        uploadFile(files.selfie_with_id, 'selfie_with_id'),
        uploadFile(files.proof_of_address, 'proof_of_address'),
        uploadFile(files.proof_of_income, 'proof_of_income'),
        uploadFile(files.bank_statement, 'bank_statement'),
        uploadFile(files.tax_return, 'tax_return'),
        uploadFile(files.business_license, 'business_license'),
        uploadFile(files.employment_letter, 'employment_letter'),
        uploadFile(files.certificate_of_incorporation, 'certificate_of_incorporation'),
        uploadFile(files.board_resolution, 'board_resolution'),
        uploadFile(files.ubo_id_document, 'ubo_id_document'),
      ]);

      const submission = {
        user_id: userId,
        status: 'ai_reviewing',
        // Identity
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
        // Contact
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
        // ID document
        id_type: form.id_type,
        id_number: form.id_number,
        id_expiry: form.id_expiry || null,
        id_issuing_country: form.id_issuing_country,
        id_issuing_authority: form.id_issuing_authority || null,
        tax_id: form.tax_id || null,
        tin_per_country: form.tin_per_country,
        // Financial
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
        // Compliance
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
        // Corporate
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
        // Document URLs
        id_front_url, id_back_url, selfie_url, selfie_with_id_url,
        proof_of_address_url, proof_of_income_url, bank_statement_url,
        tax_return_url, business_license_url, employment_letter_url,
        certificate_of_incorporation_url, board_resolution_url, ubo_id_document_url,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Upsert KYC submission
      const { error: subErr } = await supabase.from('kyc_submissions')
        .upsert([submission], { onConflict: 'user_id' });
      if (subErr) throw new Error(subErr.message);

      // Update profile with basic KYC data
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

      // Trigger AI extraction on primary ID document
      if (id_front_url) {
        supabase.functions.invoke('kyc-ai-extract', {
          body: { document_url: id_front_url, document_type: 'id_front' }
        }).catch(() => {});
      }
      if (selfie_with_id_url || selfie_url) {
        supabase.functions.invoke('kyc-ai-extract', {
          body: {
            document_url: selfie_with_id_url || selfie_url,
            document_type: selfie_with_id_url ? 'selfie_with_id' : 'selfie',
          }
        }).catch(() => {});
      }

      triggerNotification('success', 'KYC submitted successfully. Our AI compliance team will review within 24–48 hours.');
      onComplete?.();
    } catch (err) {
      triggerNotification('error', err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (STEPS[step].id) {

      case 'identity': return (
        <div className={sect}>
          <p className={secth}><User size={14}/> Sovereign Identity</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="First Name (Legal)"><input className={inp} value={form.legal_first_name} onChange={e => set('legal_first_name', e.target.value)} placeholder="As on ID" /></Field>
            <Field label="Middle Name"><input className={inp} value={form.legal_middle_name} onChange={e => set('legal_middle_name', e.target.value)} placeholder="If applicable" /></Field>
            <Field label="Last Name (Legal)"><input className={inp} value={form.legal_last_name} onChange={e => set('legal_last_name', e.target.value)} placeholder="As on ID" /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Date of Birth"><input type="date" className={inp} value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} /></Field>
            <Field label="Gender">
              <select className={sel} value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="">Select gender</option>
                <option>Male</option><option>Female</option><option>Non-binary</option><option>Prefer not to say</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Primary Nationality"><input className={inp} value={form.nationality} onChange={e => set('nationality', e.target.value)} placeholder="Country" /></Field>
            <Field label="Country of Birth"><input className={inp} value={form.country_of_birth} onChange={e => set('country_of_birth', e.target.value)} placeholder="Country" /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="City of Birth"><input className={inp} value={form.city_of_birth} onChange={e => set('city_of_birth', e.target.value)} placeholder="City" /></Field>
            <Field label="Primary Language"><input className={inp} value={form.primary_language} onChange={e => set('primary_language', e.target.value)} placeholder="e.g. English" /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Marital Status">
              <select className={sel} value={form.marital_status} onChange={e => set('marital_status', e.target.value)}>
                <option value="">Select</option>
                <option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
              </select>
            </Field>
            <Field label="Number of Dependents"><input type="number" className={inp} min="0" value={form.number_of_dependents} onChange={e => set('number_of_dependents', e.target.value)} /></Field>
          </div>
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 p-4 rounded-xl">
            <input type="checkbox" id="dual" checked={form.dual_nationality} onChange={e => set('dual_nationality', e.target.checked)} className="w-4 h-4 accent-blue-600" />
            <label htmlFor="dual" className="text-sm font-bold text-slate-700">I hold dual / multiple nationalities</label>
          </div>
          {form.dual_nationality && (
            <Field label="Second Nationality"><input className={inp} value={form.second_nationality} onChange={e => set('second_nationality', e.target.value)} placeholder="Second nationality country" /></Field>
          )}
        </div>
      );

      case 'address': return (
        <div className={sect}>
          <p className={secth}><MapPin size={14}/> Contact & Residential Address</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Primary Phone (with country code)"><input type="tel" className={inp} value={form.phone_primary} onChange={e => set('phone_primary', e.target.value)} placeholder="+1 555 000 0000" /></Field>
            <Field label="WhatsApp Number"><input type="tel" className={inp} value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)} placeholder="+1 555 000 0000" /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Primary Email"><input type="email" className={inp} value={form.email_primary} readOnly /></Field>
            <Field label="Secondary Email"><input type="email" className={inp} value={form.email_secondary} onChange={e => set('email_secondary', e.target.value)} placeholder="Optional" /></Field>
          </div>
          <p className={secth + ' mt-4'}><MapPin size={14}/> Current Residential Address</p>
          <Field label="Address Line 1"><input className={inp} value={form.residential_address_line1} onChange={e => set('residential_address_line1', e.target.value)} placeholder="Street address" /></Field>
          <Field label="Address Line 2"><input className={inp} value={form.residential_address_line2} onChange={e => set('residential_address_line2', e.target.value)} placeholder="Apt, suite, building (optional)" /></Field>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="City"><input className={inp} value={form.residential_city} onChange={e => set('residential_city', e.target.value)} /></Field>
            <Field label="State / Province"><input className={inp} value={form.residential_state} onChange={e => set('residential_state', e.target.value)} /></Field>
            <Field label="Postal Code"><input className={inp} value={form.residential_postal_code} onChange={e => set('residential_postal_code', e.target.value)} /></Field>
            <Field label="Country"><input className={inp} value={form.residential_country} onChange={e => set('residential_country', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Years at This Address"><input type="number" className={inp} min="0" value={form.years_at_address} onChange={e => set('years_at_address', e.target.value)} /></Field>
            <Field label="Home Ownership">
              <select className={sel} value={form.home_ownership} onChange={e => set('home_ownership', e.target.value)}>
                <option value="">Select</option>
                <option value="owned">Owned</option><option value="rented">Rented</option><option value="family">Family / Shared</option><option value="other">Other</option>
              </select>
            </Field>
          </div>
          <p className={secth + ' mt-4'}><MapPin size={14}/> Previous Addresses (Last 2–3 Years)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Previous Address 1"><input className={inp} value={form.previous_address_1} onChange={e => set('previous_address_1', e.target.value)} placeholder="Full address" /></Field>
            <Field label="Years There"><input type="number" className={inp} min="0" value={form.years_at_previous_address_1} onChange={e => set('years_at_previous_address_1', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Previous Address 2"><input className={inp} value={form.previous_address_2} onChange={e => set('previous_address_2', e.target.value)} placeholder="Full address (if applicable)" /></Field>
            <Field label="Years There"><input type="number" className={inp} min="0" value={form.years_at_previous_address_2} onChange={e => set('years_at_previous_address_2', e.target.value)} /></Field>
          </div>
          <p className={secth + ' mt-4'}><User size={14}/> Emergency Contact</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Full Name"><input className={inp} value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} /></Field>
            <Field label="Phone"><input type="tel" className={inp} value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} /></Field>
            <Field label="Relationship"><input className={inp} value={form.emergency_contact_relationship} onChange={e => set('emergency_contact_relationship', e.target.value)} placeholder="e.g. Spouse, Parent" /></Field>
          </div>
        </div>
      );

      case 'document': return (
        <div className={sect}>
          <p className={secth}><FileText size={14}/> Government-Issued Identity Document</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Document Type">
              <select className={sel} value={form.id_type} onChange={e => set('id_type', e.target.value)}>
                <option value="">Select type</option>
                <option value="passport">Passport</option>
                <option value="national_id">National ID Card</option>
                <option value="drivers_license">Driver's Licence</option>
                <option value="residence_permit">Residence Permit</option>
              </select>
            </Field>
            <Field label="Document Number"><input className={inp} value={form.id_number} onChange={e => set('id_number', e.target.value)} placeholder="As printed on document" /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Expiry Date"><input type="date" className={inp} value={form.id_expiry} onChange={e => set('id_expiry', e.target.value)} /></Field>
            <Field label="Issuing Country"><input className={inp} value={form.id_issuing_country} onChange={e => set('id_issuing_country', e.target.value)} /></Field>
          </div>
          <Field label="Issuing Authority"><input className={inp} value={form.id_issuing_authority} onChange={e => set('id_issuing_authority', e.target.value)} placeholder="e.g. Home Affairs, DVLA, State Dept" /></Field>
          <p className={secth + ' mt-4'}><Globe size={14}/> Tax Identification</p>
          <Field label="Primary Tax ID / TIN / SSN / NIN"><input className={inp} value={form.tax_id} onChange={e => set('tax_id', e.target.value)} placeholder="Your home country tax number" /></Field>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Multi-Country TIN (FATCA/CRS)</p>
            <p className="text-xs text-amber-700 mb-3">If you pay taxes in multiple countries, enter each country and its TIN below.</p>
            {Object.entries(form.tin_per_country).map(([country, tin], i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input className={inp + ' flex-1'} value={country} readOnly placeholder="Country" />
                <input className={inp + ' flex-1'} value={tin} readOnly placeholder="TIN" />
                <button type="button" onClick={() => { const c = {...form.tin_per_country}; delete c[country]; set('tin_per_country', c); }} className="text-red-400 hover:text-red-600"><X size={16}/></button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input id="tin_country" className={inp + ' flex-1'} placeholder="Country (e.g. USA)" />
              <input id="tin_number" className={inp + ' flex-1'} placeholder="TIN number" />
              <button type="button" className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-black"
                onClick={() => {
                  const c = document.getElementById('tin_country').value.trim();
                  const t = document.getElementById('tin_number').value.trim();
                  if (c && t) { set('tin_per_country', { ...form.tin_per_country, [c]: t }); document.getElementById('tin_country').value = ''; document.getElementById('tin_number').value = ''; }
                }}>Add</button>
            </div>
          </div>
        </div>
      );

      case 'financial': return (
        <div className={sect}>
          <p className={secth}><Briefcase size={14}/> Employment & Income</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Employment Status">
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
            <Field label="Industry / Sector"><input className={inp} value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="e.g. Finance, Healthcare, Tech" /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Employer Name"><input className={inp} value={form.employer_name} onChange={e => set('employer_name', e.target.value)} /></Field>
            <Field label="Job Title / Position"><input className={inp} value={form.job_title} onChange={e => set('job_title', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Years with Employer"><input type="number" className={inp} min="0" value={form.years_employed} onChange={e => set('years_employed', e.target.value)} /></Field>
            <Field label="Monthly Income (USD)"><input type="number" className={inp} min="0" value={form.monthly_income_usd} onChange={e => set('monthly_income_usd', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Annual Income (USD)"><input type="number" className={inp} min="0" value={form.annual_income_usd} onChange={e => set('annual_income_usd', e.target.value)} /></Field>
            <Field label="Other Income Amount (USD)"><input type="number" className={inp} min="0" value={form.other_income_amount_usd} onChange={e => set('other_income_amount_usd', e.target.value)} /></Field>
          </div>
          <Field label="Other Income Sources"><input className={inp} value={form.other_income_sources} onChange={e => set('other_income_sources', e.target.value)} placeholder="e.g. rental income, dividends, freelance" /></Field>
          <p className={secth + ' mt-4'}><DollarSign size={14}/> Wealth & Assets</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Total Net Worth (USD)"><input type="number" className={inp} min="0" value={form.total_net_worth_usd} onChange={e => set('total_net_worth_usd', e.target.value)} /></Field>
            <Field label="Liquid Assets (USD)"><input type="number" className={inp} min="0" value={form.liquid_assets_usd} onChange={e => set('liquid_assets_usd', e.target.value)} /></Field>
            <Field label="Real Estate Value (USD)"><input type="number" className={inp} min="0" value={form.real_estate_value_usd} onChange={e => set('real_estate_value_usd', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <input type="checkbox" id="crypto" checked={form.crypto_holdings} onChange={e => set('crypto_holdings', e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="crypto" className="text-sm font-bold text-slate-700">I hold cryptocurrency assets</label>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <input type="checkbox" id="loans" checked={form.existing_loans} onChange={e => set('existing_loans', e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="loans" className="text-sm font-bold text-slate-700">I have existing loans / debt</label>
            </div>
          </div>
          {form.existing_loans && <Field label="Total Outstanding Debt (USD)"><input type="number" className={inp} min="0" value={form.total_debt_usd} onChange={e => set('total_debt_usd', e.target.value)} /></Field>}
          <p className={secth + ' mt-4'}><Globe size={14}/> Source of Funds & Account Purpose</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Primary Source of Funds">
              <select className={sel} value={form.source_of_funds} onChange={e => set('source_of_funds', e.target.value)}>
                <option value="">Select</option>
                <option value="salary">Salary / Employment</option>
                <option value="business">Business Revenue</option>
                <option value="investment">Investment Returns</option>
                <option value="inheritance">Inheritance</option>
                <option value="gift">Gift / Donation</option>
                <option value="savings">Personal Savings</option>
                <option value="property">Property Sale</option>
                <option value="pension">Pension / Retirement</option>
              </select>
            </Field>
            <Field label="Purpose of Account">
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
          <Field label="Source of Funds Details"><textarea className={inp} rows={2} value={form.source_of_funds_details} onChange={e => set('source_of_funds_details', e.target.value)} placeholder="Describe how you acquired your funds in more detail" /></Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Expected Monthly Deposits (USD)"><input type="number" className={inp} min="0" value={form.expected_monthly_deposits_usd} onChange={e => set('expected_monthly_deposits_usd', e.target.value)} /></Field>
            <Field label="Expected Monthly Withdrawals (USD)"><input type="number" className={inp} min="0" value={form.expected_monthly_withdrawals_usd} onChange={e => set('expected_monthly_withdrawals_usd', e.target.value)} /></Field>
          </div>
          <Field label="Expected Transaction Types"><input className={inp} value={form.expected_transaction_purpose} onChange={e => set('expected_transaction_purpose', e.target.value)} placeholder="e.g. wire transfers, P2P payments, crypto purchases" /></Field>
        </div>
      );

      case 'compliance': return (
        <div className={sect}>
          <p className={secth}><Shield size={14}/> AML / PEP / Sanctions Declarations</p>
          <div className="space-y-3">
            {[
              { key: 'politically_exposed_person', label: 'I am or have been a Politically Exposed Person (PEP) — a current or former government official, politician, military officer, or judicial figure, or a close associate/family member of one.' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <input type="checkbox" id={key} checked={form[key]} onChange={e => set(key, e.target.checked)} className="w-4 h-4 accent-amber-600 mt-0.5" />
                <label htmlFor={key} className="text-xs font-semibold text-slate-700">{label}</label>
              </div>
            ))}
          </div>
          {form.politically_exposed_person && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="PEP Role / Position"><input className={inp} value={form.pep_role} onChange={e => set('pep_role', e.target.value)} placeholder="e.g. Minister of Finance" /></Field>
              <Field label="PEP Country"><input className={inp} value={form.pep_country} onChange={e => set('pep_country', e.target.value)} /></Field>
            </div>
          )}
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 p-4 rounded-xl">
            <input type="checkbox" id="criminal_record" checked={form.criminal_record} onChange={e => set('criminal_record', e.target.checked)} className="w-4 h-4 accent-red-600 mt-0.5" />
            <label htmlFor="criminal_record" className="text-xs font-semibold text-slate-700">I have a criminal record or am subject to criminal proceedings.</label>
          </div>
          {form.criminal_record && <Field label="Details"><textarea className={inp} rows={2} value={form.criminal_record_details} onChange={e => set('criminal_record_details', e.target.value)} placeholder="Provide details" /></Field>}

          <p className={secth + ' mt-4'}><Globe size={14}/> FATCA / CRS (Tax Compliance)</p>
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 p-4 rounded-xl">
            <input type="checkbox" id="fatca" checked={form.fatca_applicable} onChange={e => set('fatca_applicable', e.target.checked)} className="w-4 h-4 accent-blue-600 mt-0.5" />
            <label htmlFor="fatca" className="text-xs font-semibold text-slate-700">I am a US Person (US citizen, Green Card holder, or US tax resident) — FATCA applies.</label>
          </div>
          {form.fatca_applicable && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-2">
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 p-3 rounded-xl">
                <input type="checkbox" id="w8ben" checked={form.fatca_w8ben_completed} onChange={e => set('fatca_w8ben_completed', e.target.checked)} className="w-4 h-4 accent-blue-600" />
                <label htmlFor="w8ben" className="text-xs font-bold text-slate-700">W-8BEN completed (non-US income)</label>
              </div>
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 p-3 rounded-xl">
                <input type="checkbox" id="w9" checked={form.fatca_w9_completed} onChange={e => set('fatca_w9_completed', e.target.checked)} className="w-4 h-4 accent-blue-600" />
                <label htmlFor="w9" className="text-xs font-bold text-slate-700">W-9 completed (US persons)</label>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3 bg-purple-50 border border-purple-200 p-4 rounded-xl">
            <input type="checkbox" id="crs" checked={form.crs_applicable} onChange={e => set('crs_applicable', e.target.checked)} className="w-4 h-4 accent-purple-600 mt-0.5" />
            <label htmlFor="crs" className="text-xs font-semibold text-slate-700">I am tax resident in a country participating in the OECD Common Reporting Standard (CRS) exchange.</label>
          </div>
          {form.crs_applicable && <Field label="CRS Self-Certification Date"><input type="date" className={inp} value={form.crs_self_certification_date} onChange={e => set('crs_self_certification_date', e.target.value)} /></Field>}

          <p className={secth + ' mt-4'}><Briefcase size={14}/> Investor Profile</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Investment Experience">
              <select className={sel} value={form.investment_experience} onChange={e => set('investment_experience', e.target.value)}>
                <option value="">Select</option>
                <option value="none">None</option><option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option><option value="expert">Expert</option>
              </select>
            </Field>
            <Field label="Risk Appetite">
              <select className={sel} value={form.risk_appetite} onChange={e => set('risk_appetite', e.target.value)}>
                <option value="">Select</option>
                <option value="conservative">Conservative</option>
                <option value="moderate">Moderate</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </Field>
            <Field label="Investment Horizon">
              <select className={sel} value={form.investment_horizon} onChange={e => set('investment_horizon', e.target.value)}>
                <option value="">Select</option>
                <option value="short">Short (&lt;2 years)</option>
                <option value="medium">Medium (2–7 years)</option>
                <option value="long">Long (&gt;7 years)</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Regulatory Category">
              <select className={sel} value={form.regulatory_category} onChange={e => set('regulatory_category', e.target.value)}>
                <option value="retail">Retail Client</option>
                <option value="professional">Professional Client</option>
                <option value="institutional">Institutional Client</option>
              </select>
            </Field>
            <Field label="Investor Classification">
              <select className={sel} value={form.investor_classification} onChange={e => set('investor_classification', e.target.value)}>
                <option value="retail">Retail Investor</option>
                <option value="accredited">Accredited Investor</option>
                <option value="qualified">Qualified Investor</option>
              </select>
            </Field>
          </div>
        </div>
      );

      case 'corporate': return (
        <div className={sect}>
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl mb-2">
            <input type="checkbox" id="is_corp" checked={form.is_corporate} onChange={e => set('is_corporate', e.target.checked)} className="w-4 h-4 accent-blue-600" />
            <label htmlFor="is_corp" className="text-sm font-black text-slate-700">This account is for a company / corporate entity</label>
          </div>
          {form.is_corporate ? (
            <>
              <p className={secth}><Building2 size={14}/> Company Information</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Legal Company Name"><input className={inp} value={form.company_legal_name} onChange={e => set('company_legal_name', e.target.value)} /></Field>
                <Field label="Registration Number"><input className={inp} value={form.company_registration_number} onChange={e => set('company_registration_number', e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Country of Registration"><input className={inp} value={form.company_registration_country} onChange={e => set('company_registration_country', e.target.value)} /></Field>
                <Field label="Company Type">
                  <select className={sel} value={form.company_type} onChange={e => set('company_type', e.target.value)}>
                    <option value="">Select</option>
                    <option>LLC</option><option>Corporation</option><option>Partnership</option>
                    <option>Sole Trader</option><option>NGO / NPO</option><option>Trust</option><option>Other</option>
                  </select>
                </Field>
              </div>
              <Field label="Industry / Business Activity"><input className={inp} value={form.company_industry} onChange={e => set('company_industry', e.target.value)} /></Field>
              <p className={secth + ' mt-4'}><User size={14}/> Ultimate Beneficial Owner (UBO)</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="UBO Full Name"><input className={inp} value={form.ubo_full_name} onChange={e => set('ubo_full_name', e.target.value)} /></Field>
                <Field label="UBO Nationality"><input className={inp} value={form.ubo_nationality} onChange={e => set('ubo_nationality', e.target.value)} /></Field>
                <Field label="UBO Ownership %"><input type="number" className={inp} min="0" max="100" value={form.ubo_ownership_percentage} onChange={e => set('ubo_ownership_percentage', e.target.value)} placeholder="e.g. 51" /></Field>
              </div>
              <Field label="UBO Declaration">
                <textarea className={inp} rows={3} value={form.ubo_declaration} onChange={e => set('ubo_declaration', e.target.value)} placeholder="I declare that the above information on the Ultimate Beneficial Owner is true and correct to the best of my knowledge." />
              </Field>
            </>
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm font-bold">
              <Building2 size={32} className="mx-auto mb-3 opacity-30" />
              <p>Check the box above if opening on behalf of a company.</p>
              <p className="text-xs mt-1 opacity-60">Personal accounts can skip this step.</p>
            </div>
          )}
        </div>
      );

      case 'documents': return (
        <div className={sect}>
          <p className={secth}><FileText size={14}/> Identity Documents (Required)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DocUpload label="Government ID — Front *" field="id_front" files={files} onChange={setFile} />
            <DocUpload label="Government ID — Back" field="id_back" files={files} onChange={setFile} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DocUpload label="Selfie (Face Only)" field="selfie" files={files} onChange={setFile} accept="image/*" />
            <DocUpload label="Selfie Holding ID *" field="selfie_with_id" files={files} onChange={setFile} accept="image/*" />
          </div>
          <p className={secth + ' mt-4'}><MapPin size={14}/> Address Verification (Required)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DocUpload label="Proof of Address * (utility bill / bank statement, max 90 days old)" field="proof_of_address" files={files} onChange={setFile} />
            <DocUpload label="Utility Bill" field="utility_bill" files={files} onChange={setFile} />
          </div>
          <p className={secth + ' mt-4'}><DollarSign size={14}/> Financial Documents</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DocUpload label="Proof of Income (payslip / contract)" field="proof_of_income" files={files} onChange={setFile} />
            <DocUpload label="Bank Statement (last 3 months)" field="bank_statement" files={files} onChange={setFile} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DocUpload label="Tax Return / Tax Certificate" field="tax_return" files={files} onChange={setFile} />
            <DocUpload label="Employment Letter" field="employment_letter" files={files} onChange={setFile} />
          </div>
          {form.is_corporate && (
            <>
              <p className={secth + ' mt-4'}><Building2 size={14}/> Corporate Documents</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DocUpload label="Certificate of Incorporation" field="certificate_of_incorporation" files={files} onChange={setFile} />
                <DocUpload label="Board Resolution / Authorisation" field="board_resolution" files={files} onChange={setFile} />
              </div>
              <DocUpload label="UBO Government ID" field="ubo_id_document" files={files} onChange={setFile} />
            </>
          )}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Document Requirements</p>
            <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
              <li>Images must be clear, in focus, and fully visible (all 4 corners)</li>
              <li>Accepted formats: JPG, PNG, PDF, HEIC (max 10 MB per file)</li>
              <li>Proof of address must be dated within the last 90 days</li>
              <li>All text must be legible — no blurry or cropped documents</li>
            </ul>
          </div>
        </div>
      );

      case 'review': return (
        <div className={sect}>
          <p className={secth}><CheckCircle2 size={14}/> Review Your Submission</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Full Name', val: `${form.legal_first_name} ${form.legal_middle_name} ${form.legal_last_name}`.trim() || '—' },
              { label: 'Date of Birth', val: form.date_of_birth || '—' },
              { label: 'Nationality', val: form.nationality || '—' },
              { label: 'ID Type', val: form.id_type || '—' },
              { label: 'ID Number', val: form.id_number || '—' },
              { label: 'Country', val: form.residential_country || '—' },
              { label: 'Phone', val: form.phone_primary || '—' },
              { label: 'Employment', val: form.employment_status || '—' },
              { label: 'Monthly Income', val: form.monthly_income_usd ? `$${Number(form.monthly_income_usd).toLocaleString()}` : '—' },
              { label: 'Source of Funds', val: form.source_of_funds || '—' },
              { label: 'PEP', val: form.politically_exposed_person ? 'YES ⚠️' : 'No' },
              { label: 'FATCA', val: form.fatca_applicable ? 'Applicable' : 'Not Applicable' },
            ].map(({ label, val }) => (
              <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">{val}</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Documents Uploaded</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(files).filter(([, v]) => v).map(([k]) => (
                <span key={k} className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg flex items-center gap-1">
                  <CheckCircle2 size={10}/>{k.replace(/_/g,' ')}
                </span>
              ))}
              {!Object.values(files).some(Boolean) && <span className="text-xs text-red-500 font-bold">No documents uploaded yet</span>}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 space-y-4">
            <h4 className="font-black text-slate-800 text-sm">AML / CTF Declaration</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              I hereby declare that all information provided in this application is true, accurate, and complete to the best of my knowledge. I understand that providing false information is a criminal offence under applicable AML/CTF regulations. I consent to IFB performing background checks, sanctions screening, and periodic KYC reviews as required by FATF, FATCA, CRS, and applicable local regulations. I authorise IFB to verify my identity, address, and financial information with third-party providers, credit bureaus, and government databases. I acknowledge that my account may be suspended pending investigation if suspicious activity is detected.
            </p>
            <div className="flex items-start gap-3">
              <input type="checkbox" id="aml_agree" checked={form.aml_terms_agreed} onChange={e => set('aml_terms_agreed', e.target.checked)} className="w-5 h-5 accent-blue-600 mt-0.5" />
              <label htmlFor="aml_agree" className="text-xs font-black text-slate-700">
                I have read and agree to the AML/CTF declaration, Terms of Service, and Privacy Policy. I consent to identity verification and ongoing monitoring.
              </label>
            </div>
          </div>
          {Object.values(uploadProgress).length > 0 && (
            <div className="space-y-1">
              {Object.entries(uploadProgress).map(([doc, status]) => (
                <div key={doc} className="flex items-center gap-2 text-xs">
                  {status === 'uploading' ? <Loader2 size={12} className="animate-spin text-blue-500" /> : <CheckCircle2 size={12} className="text-emerald-500" />}
                  <span className="font-bold text-slate-600">{doc.replace(/_/g,' ')}</span>
                  <span className="text-slate-400">{status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );

      default: return null;
    }
  };

  const currentStep = STEPS[step];

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 flex-1">
            <button type="button" onClick={() => i < step && setStep(i)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${i === step ? 'bg-blue-600 text-white shadow-lg scale-110' : i < step ? 'bg-emerald-500 text-white cursor-pointer' : 'bg-slate-100 text-slate-400'}`}>
              {i < step ? <CheckCircle2 size={14}/> : i + 1}
            </button>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < step ? 'bg-emerald-400' : 'bg-slate-100'}`} />}
          </div>
        ))}
      </div>
      <div>
        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <currentStep.icon size={18} className="text-blue-600" />
          Step {step + 1} of {STEPS.length}: {currentStep.label}
        </h3>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
          {['Fill in your full legal identity details', 'Residential and contact information', 'Government-issued ID details and tax numbers', 'Employment, income, and source of funds', 'AML, PEP, FATCA/CRS compliance declarations', 'Corporate entity details (if applicable)', 'Upload required identity and financial documents', 'Review all information and submit'][step]}
        </p>
      </div>
      <div className="min-h-[300px]">{renderStep()}</div>
      <div className="flex justify-between items-center border-t border-slate-100 pt-6">
        <button type="button" onClick={prev} disabled={step === 0}
          className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest rounded-2xl transition-all disabled:opacity-30">
          <ChevronLeft size={14}/> Back
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={next}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg">
            Continue <ChevronRight size={14}/>
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={submitting || !form.aml_terms_agreed}
            className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg disabled:opacity-50">
            {submitting ? <><Loader2 size={14} className="animate-spin"/> Processing...</> : <><ShieldCheck size={14}/> Submit KYC</>}
          </button>
        )}
      </div>
    </div>
  );
}
