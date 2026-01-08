import { GoogleGenAI } from "@google/genai";
import { BearHotspot } from "../types";

export const performScan = async (xaiKey?: string, location?: string): Promise<{ hotspots: BearHotspot[], counts: { grok: number, gemini: number } }> => {
  try {
    // Call backend scan endpoint which handles both Gemini and Grok logic
    // Note: xaiKey argument is now ignored in favor of backend environment variable
    // Use absolute URL for local dev to bypass Vite proxy issues
    const response = await fetch('http://localhost:8080/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location })
    });

    if (!response.ok) {
      throw new Error(`Scan failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      hotspots: data.hotspots || [],
      counts: data.counts || { grok: 0, gemini: 0 }
    };

  } catch (e: any) {
    console.error("Scan Error:", e);
    throw new Error(e.message || "AI Scan Service Failed");
  }
};

/**
 * AI Verification Logic for Crowdsourcing
 * Uses Gemini Vision (multimodal) and Backend Grok (xAI) for verification.
 */
export const verifyImageContent = async (base64Image: string, xaiKey?: string): Promise<{
  isBearSign: boolean;
  confidence: number;
  explanation: string;
  detectedType?: 'BEAR' | 'FOOTPRINT' | 'SCAT' | 'OTHER';
  voters?: { gemini: boolean, secondary: boolean, method: 'GROK' | 'GEMINI_REFLECTION' }
}> => {

  // Clean base64 string
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  // --- Vote 1: Gemini Vision (Client Side - could also be moved to backend but keeping for now if easier) ---
  // Ideally, move ALL logic to backend, but Gemini JS SDK is client-friendly. 
  // For consistency with the server.js change instructions, I'll keep Gemini client side here 
  // OR move it too? The prompt implied moving Grok. I will keep Gemini as is for now to minimize risk, 
  // but the server.js has performGeminiSearch logic.
  // Wait, server.js has performGeminiSearch for NEWS, but this is IMAGE verification. 
  // Let's keep Gemini Vision client-side as it was working, and only proxy Grok.

  let geminiVote = false;
  let geminiData: any = {};

  try {
    const client = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

    const prompt = `
      Analyze this image strictly for hiker safety.
      Question: Does this image clearly show a BEAR, a fresh BEAR FOOTPRINT, or BEAR SCAT (Poop)?
      If it is a dog, a cat, a monkey, or just trees/rocks, return isBearSign: false.
      
      Output strictly JSON:
      {
        "isBearSign": boolean,
        "confidence": number (0-100),
        "detectedType": "BEAR" | "FOOTPRINT" | "SCAT" | "OTHER",
        "explanation": "Short string explaining why (max 20 words) in Traditional Chinese."
      }
    `;

    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }
          ]
        }
      ]
    });

    const text = response.text || "";
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    geminiData = JSON.parse(jsonStr);
    geminiVote = geminiData.isBearSign === true;

  } catch (error) {
    console.error("Gemini Verification Failed:", error);
    // return { isBearSign: false, confidence: 0, explanation: "AI 1 (Gemini) 連線失敗" };
    // Proceed to Grok anyway? No, usually Gemini is primary.
    // Let's just default to fail if Gemini fails mostly.
    return { isBearSign: false, confidence: 0, explanation: "AI 驗證失敗" };
  }

  // --- Vote 2: Secondary Check (Consensus) via Backend Grok ---
  let secondaryVote = false;
  let method: 'GROK' | 'GEMINI_REFLECTION' = 'GROK';

  // Always try Grok via backend verify endpoint
  try {
    const verifyRes = await fetch('http://localhost:8080/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: `data:image/jpeg;base64,${cleanBase64}` })
    });

    const verifyData = await verifyRes.json();
    if (verifyData.success) {
      secondaryVote = verifyData.vote;
      method = 'GROK';
    } else {
      // Fallback logic if needed, or just marks as false
      console.warn("Backend Grok Verify Failed:", verifyData.error);
      secondaryVote = false; // or try reflection?
    }
  } catch (e) {
    console.error("Backend Verify Call Error:", e);
  }

  // --- Final Consensus ---
  const finalVerdict = geminiVote && secondaryVote;

  return {
    isBearSign: finalVerdict,
    confidence: finalVerdict ? Math.max(geminiData.confidence || 0, 85) : 40,
    explanation: finalVerdict
      ? `雙重 AI 驗證通過 (Gemini + Grok)`
      : `AI 意見分歧，判定為不安全 (Grok 駁回)`,
    detectedType: geminiData.detectedType,
    voters: {
      gemini: geminiVote,
      secondary: secondaryVote,
      method
    }
  };
};