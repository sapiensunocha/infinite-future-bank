// Data access for the Partner Hub. Every call runs as the signed-in user; the
// database's row-level security limits each partner team to its own data.
import { supabase } from '../../services/supabaseClient';

export const CONSENT_VERSION = 'IFB-FARMER-CONSENT-v1';

// Read aloud / shown to the farmer before they are enrolled (FR first: Cameroon).
export const CONSENT_TEXT = {
  fr: "J'accepte que Greenhouse Ventures et Infinite Future Bank enregistrent mon nom, mon numéro de téléphone et l'emplacement de mes champs afin de surveiller les risques agricoles (sécheresse, inondation, maladies des cultures) et de me proposer des services d'assurance et de financement. Je peux retirer mon accord à tout moment.",
  en: 'I agree that Greenhouse Ventures and Infinite Future Bank record my name, phone number and the location of my fields to monitor farm risks (drought, flood, crop disease) and to offer me insurance and finance services. I can withdraw my consent at any time.',
};

const unwrap = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

export async function myPartners() {
  return unwrap(await supabase.from('partners').select('id, code, name, country, status, agreement_ref').order('name'));
}
export async function myRole(partnerId, userId) {
  const rows = unwrap(await supabase.from('partner_members').select('role').eq('partner_id', partnerId).eq('user_id', userId));
  return rows?.[0]?.role || null;
}
export async function overview(partnerId) {
  return unwrap(await supabase.rpc('partner_overview', { p_partner: partnerId }));
}
export async function createPartner(p) {
  return unwrap(await supabase.rpc('admin_create_partner', {
    p_code: p.code, p_name: p.name, p_country: p.country, p_agreement_ref: p.agreement_ref,
    p_owner_email: p.owner_email, p_legal_name: p.legal_name || null,
  }));
}

export async function listFarmers(partnerId, q = '') {
  let query = supabase.from('farmers')
    .select('id, full_name, phone, gender, region, locality, language, external_ref, status, created_at')
    .eq('partner_id', partnerId).order('created_at', { ascending: false }).limit(200);
  const s = q.trim().replace(/[%,()]/g, '');
  if (s) query = query.or(`full_name.ilike.%${s}%,phone.ilike.%${s}%,external_ref.ilike.%${s}%`);
  return unwrap(await query);
}
export async function addFarmer(partnerId, f, consentMethod) {
  return unwrap(await supabase.from('farmers').insert({
    partner_id: partnerId,
    full_name: f.full_name.trim(),
    phone: normalizePhone(f.phone) || null,
    gender: f.gender || null,
    birth_year: f.birth_year ? Number(f.birth_year) : null,
    region: f.region?.trim() || null,
    locality: f.locality?.trim() || null,
    language: f.language || 'fr',
    external_ref: f.external_ref?.trim() || null,
    consent_at: new Date().toISOString(),
    consent_version: CONSENT_VERSION,
    consent_method: consentMethod,
  }).select('id').single());
}
export async function importFarmers(partnerId, rows, consentMethod) {
  return unwrap(await supabase.rpc('partner_import_farmers', {
    p_partner: partnerId, p_rows: rows, p_consent_method: consentMethod, p_consent_version: CONSENT_VERSION,
  }));
}
export async function setFarmerStatus(id, status) {
  return unwrap(await supabase.from('farmers').update({ status }).eq('id', id));
}

export async function farmerFarmsAndFields(farmerId) {
  const farms = unwrap(await supabase.from('farms').select('id, name, locality').eq('farmer_id', farmerId).order('created_at'));
  const fields = unwrap(await supabase.from('fields')
    .select('id, farm_id, name, crop, planting_date, area_ha, centroid_lat, centroid_lng, monitoring_status, boundary_geojson, created_at')
    .eq('farmer_id', farmerId).order('created_at'));
  return { farms, fields };
}
export async function listFields(partnerId) {
  return unwrap(await supabase.from('fields')
    .select('id, name, crop, area_ha, centroid_lat, centroid_lng, monitoring_status, boundary_geojson, farmer_id, farmers(full_name)')
    .eq('partner_id', partnerId).order('created_at', { ascending: false }).limit(1000));
}
export async function ensureFarm(partnerId, farmerId) {
  const existing = unwrap(await supabase.from('farms').select('id').eq('farmer_id', farmerId).order('created_at').limit(1));
  if (existing?.length) return existing[0].id;
  return unwrap(await supabase.from('farms').insert({ partner_id: partnerId, farmer_id: farmerId, name: 'Main farm' }).select('id').single()).id;
}
export async function addField(partnerId, farmId, f) {
  return unwrap(await supabase.from('fields').insert({
    partner_id: partnerId, farm_id: farmId, name: f.name.trim(), crop: f.crop?.trim() || null,
    planting_date: f.planting_date || null, boundary_geojson: f.boundary,
  }).select('id, area_ha').single());
}
export async function deleteField(id) {
  return unwrap(await supabase.from('fields').delete().eq('id', id));
}

export async function listMembers(partnerId) {
  return unwrap(await supabase.rpc('partner_list_members', { p_partner: partnerId }));
}
export async function setMember(partnerId, email, role) {
  return unwrap(await supabase.rpc('partner_set_member', { p_partner: partnerId, p_email: email.trim(), p_role: role }));
}
export async function removeMember(partnerId, userId) {
  return unwrap(await supabase.rpc('partner_remove_member', { p_partner: partnerId, p_user: userId }));
}

// "+237 6 77 12 34 56" -> "+237677123456"; local Cameroon numbers (9 digits starting 6/2) get +237.
export function normalizePhone(p) {
  if (!p) return '';
  let s = String(p).replace(/[\s().-]/g, '');
  if (/^00\d+/.test(s)) s = '+' + s.slice(2);
  if (/^[62]\d{8}$/.test(s)) s = '+237' + s;
  return s;
}

// Minimal CSV parser (quoted fields, commas or semicolons). Returns array of objects keyed by header.
export function parseCsv(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  const split = (line) => {
    const out = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === sep) { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur); return out.map((x) => x.trim());
  };
  const ALIASES = { name: 'full_name', nom: 'full_name', fullname: 'full_name', telephone: 'phone', tel: 'phone', mobile: 'phone',
    sexe: 'gender', sex: 'gender', village: 'locality', localite: 'locality', town: 'locality', langue: 'language',
    id: 'external_ref', ref: 'external_ref', reference: 'external_ref', annee_naissance: 'birth_year', year_of_birth: 'birth_year' };
  const GENDER = { f: 'female', femme: 'female', female: 'female', m: 'male', h: 'male', homme: 'male', male: 'male' };
  const header = split(lines[0]).map((h) => {
    const k = h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    return ALIASES[k] || k;
  });
  return lines.slice(1).map((line) => {
    const cells = split(line); const o = {};
    header.forEach((h, i) => { if (cells[i] !== undefined && cells[i] !== '') o[h] = cells[i]; });
    if (o.phone) o.phone = normalizePhone(o.phone);
    if (o.gender) o.gender = GENDER[o.gender.toLowerCase()] || o.gender.toLowerCase();
    if (o.language) o.language = o.language.toLowerCase().startsWith('en') ? 'en' : 'fr';
    return o;
  });
}

// Geodesic polygon area in hectares (same idea as PostGIS; used for a live preview only —
// the database measures the authoritative value).
export function polygonAreaHa(latlngs) {
  if (!latlngs || latlngs.length < 3) return 0;
  const R = 6378137; const rad = (d) => (d * Math.PI) / 180;
  let sum = 0;
  for (let i = 0; i < latlngs.length; i++) {
    const [lat1, lng1] = latlngs[i]; const [lat2, lng2] = latlngs[(i + 1) % latlngs.length];
    sum += rad(lng2 - lng1) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
  }
  return Math.abs((sum * R * R) / 2) / 10000;
}
export function toGeoJsonPolygon(latlngs) {
  const ring = latlngs.map(([lat, lng]) => [Number(lng.toFixed(7)), Number(lat.toFixed(7))]);
  ring.push(ring[0]);
  return { type: 'Polygon', coordinates: [ring] };
}
export function fromGeoJsonPolygon(g) {
  const ring = g?.coordinates?.[0] || [];
  return ring.slice(0, -1).map(([lng, lat]) => [lat, lng]);
}
