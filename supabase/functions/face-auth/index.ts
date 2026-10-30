/**
 * face-auth Edge Function
 *
 * Native mode only: the device sends the raw token from its biometric-protected
 * keychain; we SHA-256 it and constant-time compare to profiles.face_auth_token_hash.
 * Web mode is unsupported (a browser-side descriptor match cannot be trusted).
 *
 * On success: calls auth.admin.generateLink({ type:'magiclink', email })
 * Returns:    { token_hash } — client calls supabase.auth.verifyOtp({ token_hash, type:'magiclink' })
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, sha256Hex, timingSafeEqualStr } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } });
  // Uniform failure so the endpoint can't be used to probe accounts / enrollment.
  const denied = () => json({ error: 'Face login failed.' }, 401);

  try {
    const { mode, email, token } = await req.json();

    if (mode !== 'native') return json({ error: 'unsupported' }, 400);
    if (typeof email !== 'string' || !email || typeof token !== 'string' || token.length < 32) {
      return json({ error: 'Missing email or token.' }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, face_login_enabled, face_auth_token_hash')
      .eq('email_lower', email.toLowerCase())
      .maybeSingle();

    const presentedHash = await sha256Hex(token);
    if (profileError || !profile || !profile.face_login_enabled || !profile.face_auth_token_hash ||
        !timingSafeEqualStr(presentedHash, String(profile.face_auth_token_hash).toLowerCase())) {
      return denied();
    }

    // Issue the link for the account's own email (from auth), not the request value.
    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    if (userErr || !userData?.user?.email) return denied();

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
      options: {
        redirectTo: Deno.env.get('APP_URL') || 'https://deus.infinitefuturebank.org',
      }
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('generateLink error:', linkError?.message);
      return json({ error: 'Failed to generate secure session.' }, 500);
    }

    return json({ token_hash: linkData.properties.hashed_token });

  } catch (err) {
    console.error('face-auth error:', err instanceof Error ? err.message : err);
    return json({ error: 'Internal server error.' }, 500);
  }
});
