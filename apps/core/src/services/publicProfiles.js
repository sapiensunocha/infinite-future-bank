// Other users are read through `profiles_public` (name, photo, tier, agent info),
// never through `profiles`, which only returns your own row. See migrations 20261116/17.
import { supabase } from './supabaseClient';

/** Adds `{ full_name, avatar_url }` of the user in row[idKey] as row[asKey]. */
export async function attachPublicProfiles(rows, idKey, asKey) {
  const list = rows || [];
  const ids = [...new Set(list.map((r) => r?.[idKey]).filter(Boolean))];
  if (ids.length === 0) return list;
  const { data } = await supabase.from('profiles_public').select('id, full_name, avatar_url').in('id', ids);
  const byId = Object.fromEntries((data || []).map((p) => [p.id, p]));
  return list.map((r) => ({ ...r, [asKey]: byId[r?.[idKey]] || null }));
}

/** Verified agents (Community of Trust processors). Location is rounded to ~1 km. */
export async function fetchAgents(limit = 30) {
  return supabase
    .from('profiles_public')
    .select('id, full_name, avatar_url, cot_rating, cot_completed_tx, cot_payment_methods, latitude, longitude, country')
    .eq('is_cot_processor', true)
    .limit(limit);
}

/** Search other IFB users by exact email or by name (3+ letters). Emails come back masked. */
export async function findIfbUsers(query, limit = 5) {
  const { data, error } = await supabase.rpc('find_ifb_users', { p_query: query, p_limit: limit });
  return { data: (data || []).map((u) => ({ ...u, email: u.email_hint })), error };
}
