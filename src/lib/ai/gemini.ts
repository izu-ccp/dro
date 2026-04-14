// ============================================================================
// Gemini AI Client — Google AI Studio integration
// Uses REST API directly to avoid extra dependencies
// ============================================================================

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-2.5-flash";

interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

interface GeminiResponse {
  candidates?: {
    content: { parts: { text: string }[] };
    finishReason: string;
  }[];
  error?: { message: string; code: number };
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set in environment");
  return key;
}

// ---------------------------------------------------------------------------
// Core: send a prompt to Gemini and get a text response
// ---------------------------------------------------------------------------

export async function geminiChat(
  systemPrompt: string,
  messages: GeminiMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const apiKey = getApiKey();
  const url = `${GEMINI_API_URL}/${MODEL}:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: messages,
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 1024,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as GeminiResponse;

  if (data.error) {
    console.error("Gemini API error:", data.error);
    throw new Error(`Gemini: ${data.error.message}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

// ---------------------------------------------------------------------------
// Shorthand: single prompt in, text out
// ---------------------------------------------------------------------------

export async function geminiPrompt(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  return geminiChat(
    systemPrompt,
    [{ role: "user", parts: [{ text: userPrompt }] }],
    options,
  );
}

// ---------------------------------------------------------------------------
// Structured: get JSON response from Gemini
// ---------------------------------------------------------------------------

export async function geminiJSON<T = Record<string, unknown>>(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number },
): Promise<T> {
  const text = await geminiPrompt(
    systemPrompt + "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanation.",
    userPrompt,
    { temperature: options?.temperature ?? 0.3, maxTokens: options?.maxTokens ?? 512 },
  );

  // Strip markdown code blocks if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned) as T;
}
