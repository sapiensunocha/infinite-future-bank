import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text } = await req.json()
    
    // 1. Get the secret Google JSON key from your Supabase vault
    const credentialsString = Deno.env.get('GOOGLE_CREDENTIALS');
    if (!credentialsString) {
      throw new Error("Missing Google Credentials in Vault");
    }
    const credentials = JSON.parse(credentialsString);

    // 2. Exchange the credentials for a Google Access Token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${await generateJWT(credentials)}`
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error("Failed to get Google Access Token: " + JSON.stringify(tokenData));
    }
    const { access_token } = tokenData;

    // 3. Call Google Text-to-Speech API
    const ttsRes = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: { text },
        // 🔥 This is the charismatic, professional UK female voice
        voice: { languageCode: 'en-GB', name: 'en-GB-Neural2-A' }, 
        audioConfig: { audioEncoding: 'MP3', speakingRate: 0.90, pitch: -2.0 }
      })
    });

    const audioData = await ttsRes.json();
    if (!audioData.audioContent) {
      throw new Error("Failed to generate audio from Google: " + JSON.stringify(audioData));
    }

    // 4. Send the audio back to the frontend
    return new Response(
      JSON.stringify({ audioContent: audioData.audioContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

// --- Helper functions to securely sign the JWT for Google ---
async function generateJWT(creds: any) {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const iat = Math.floor(Date.now() / 1000);
  const claim = btoa(JSON.stringify({
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: iat + 3600,
    iat
  }));
  
  const key = await crypto.subtle.importKey(
    "pkcs8",
    str2ab(creds.private_key.replace(/-----.*?-----/g, '').replace(/\n/g, '')),
    { name: "RSASSA-PKCS1-v1_5", hash: {name: "SHA-256"} },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claim}`));
  return `${header}.${claim}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

function str2ab(str: string) {
  const binaryString = atob(str);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}