/**
 * face-auth Edge Function
 *
 * Two modes:
 *  - native: verifies SHA-256(rawToken) against profiles.face_auth_token_hash
 *  - web:    trusts client-side descriptor match (comparison done in FaceAuthManager),
 *            issues session for confirmed email
 *
 * On success: calls auth.admin.generateLink({ type:'magiclink', email })
 * Returns:    { token_hash } — client calls supabase.auth.verifyOtp({ token_hash, type:'magiclink' })
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { mode, email, tokenHash } = await req.json();

    if (!mode || !email) {
      return new Response(JSON.stringify({ error: 'Missing mode or email.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── NATIVE MODE: verify token hash ────────────────────────────────────────
    if (mode === 'native') {
      if (!tokenHash) {
        return new Response(JSON.stringify({ error: 'Missing tokenHash for native mode.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Look up the profile by email_lower and verify the hash
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, face_login_enabled, face_auth_token_hash')
        .eq('email_lower', email.toLowerCase())
        .maybeSingle();

      if (profileError || !profile) {
        return new Response(JSON.stringify({ error: 'Account not found.' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!profile.face_login_enabled) {
        return new Response(JSON.stringify({ error: 'Face login is not enabled for this account.' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (profile.face_auth_token_hash !== tokenHash) {
        return new Response(JSON.stringify({ error: 'Biometric token mismatch. Access denied.' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ── WEB MODE: trust client-side descriptor match, verify face is enabled ──
    if (mode === 'web') {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('face_login_enabled')
        .eq('email_lower', email.toLowerCase())
        .maybeSingle();

      if (profileError || !profile || !profile.face_login_enabled) {
        return new Response(JSON.stringify({ error: 'Face login not enabled for this account.' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ── Generate magic-link session token for the verified user ───────────────
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase(),
      options: {
        redirectTo: Deno.env.get('APP_URL') || 'https://deus.infinitefuturebank.org',
      }
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('generateLink error:', linkError);
      return new Response(JSON.stringify({ error: 'Failed to generate secure session.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(
      JSON.stringify({ token_hash: linkData.properties.hashed_token }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('face-auth error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
