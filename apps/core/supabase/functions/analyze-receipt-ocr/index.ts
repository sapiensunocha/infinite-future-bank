import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Set up CORS headers for the frontend to communicate with this function
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
    const { imageUrl, expectedAmount, type } = await req.json()

    if (!imageUrl) {
      throw new Error("Missing imageUrl in request body.")
    }

    // 1. Fetch the image from the Supabase Storage URL
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error("Failed to download image from storage.")
    }
    
    // 2. Convert the image to a Base64 string for the AI
    const arrayBuffer = await imageResponse.arrayBuffer()
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    
    // Detect mime type (defaulting to jpeg if unknown)
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'

    // 3. Prepare the Prompt for Gemini
    // We instruct it to strictly return JSON so we can parse it programmatically.
    const prompt = `
      You are a strict financial compliance AI for an institutional bank. 
      Analyze this transfer receipt (which may be a Bank Wire, M-Pesa, Wave, or Cash Drop receipt).
      Extract the following information:
      1. The transaction amount (as a raw number, no currency symbols).
      2. The unique transaction Reference ID or Receipt Number.
      3. The Date of the transaction.
      
      Return ONLY a raw, valid JSON object with the exact keys: "extracted_amount" (number), "extracted_ref_id" (string), and "extracted_date" (string). 
      Do not include markdown formatting, backticks, or any other text.
    `

    // 4. Call the Gemini Vision API
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') // We will set this in Supabase secrets
    
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1, // Low temperature for factual extraction
        }
      })
    })

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text()
      console.error("Gemini API Error:", errText)
      throw new Error("AI Engine failed to process the document.")
    }

    const geminiData = await geminiResponse.json()
    
    // 5. Parse the AI's response
    const rawText = geminiData.candidates[0].content.parts[0].text.trim()
    let extractedData;
    
    try {
      // Clean up potential markdown formatting if the AI disobeys the prompt
      const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      extractedData = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error("Failed to parse AI output:", rawText)
      throw new Error("AI returned unreadable data format.")
    }

    // 6. Security Check: Verify the expected amount (Optional but recommended)
    // If the user claimed they deposited $500, but the receipt says $50, flag it.
    if (expectedAmount) {
       const aiAmount = parseFloat(extractedData.extracted_amount)
       const userAmount = parseFloat(expectedAmount)
       
       // Allow a small margin of error for currency conversion discrepancies
       if (Math.abs(aiAmount - userAmount) > (userAmount * 0.05)) {
         return new Response(
           JSON.stringify({ error: `Amount mismatch. You declared $${userAmount}, but AI detected$${aiAmount}. Transaction flagged.` }),
           { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
         )
       }
    }

    // 7. Return the verified data to the frontend to close the block
    return new Response(
      JSON.stringify({
        extracted_amount: extractedData.extracted_amount,
        extracted_ref_id: extractedData.extracted_ref_id,
        extracted_date: extractedData.extracted_date,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})