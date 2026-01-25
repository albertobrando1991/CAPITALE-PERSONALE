
import OpenAI from "openai";

export type AITask =
  | "flashcards_generate"
  | "flashcard_explain"
  | "distractors_generate"
  | "quiz_generate"
  | "fase3_drill_generate"
  | "concept_explain"
  | "sq3r_generate"
  | "sq3r_chapters_extract"
  | "recovery_plan"
  | "reframing_generate"
  | "ocr_images"
  | "oral_exam_question"
  | "oral_exam_evaluate"
  | "generic";

export type AIResponseMode = "text" | "json";

export type AIJsonRoot = "any" | "object" | "array";

export interface AIImageInput {
  mimeType: string;
  base64: string;
}

let openRouterClient: OpenAI | null = null;
let openAIDirectClient: OpenAI | null = null;

/**
 * Get a direct OpenAI client for TTS (Text-to-Speech).
 * OpenRouter does NOT support the audio/speech API, so we need to use OpenAI directly.
 */
export function getOpenAIDirectClient(): OpenAI | null {
  if (openAIDirectClient) return openAIDirectClient;

  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not configured - TTS will not work with natural voices");
    return null;
  }

  openAIDirectClient = new OpenAI({
    apiKey,
    // Use default OpenAI base URL (https://api.openai.com/v1)
  });

  return openAIDirectClient;
}

export function getOpenRouterClient(): OpenAI {
  if (openRouterClient) return openRouterClient;

  const apiKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.OPEN_ROUTER_API_KEY ||
    process.env.OPEN_ROUTER;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY non configurata");
  }

  const baseURL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  const referer = process.env.OPENROUTER_SITE_URL;
  const title = process.env.OPENROUTER_APP_NAME;

  openRouterClient = new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders: {
      ...(referer ? { "HTTP-Referer": referer } : {}),
      ...(title ? { "X-Title": title } : {}),
    },
  });

  return openRouterClient;
}

/**
 * @deprecated Use getOpenRouterClient() instead. Maintained for backward compatibility.
 */
export function getOpenAIClient(): OpenAI {
  return getOpenRouterClient();
}

/**
 * @deprecated Use getOpenRouterClient() or generateWithFallback instead.
 * Returns null as we moved to OpenAI-compatible interface via OpenRouter.
 */
export function getGeminiClient(): any | null {
  return null;
}

/**
 * Cleans JSON output from AI models (removes markdown code blocks).
 */
export function cleanJson(text: string): string {
  if (!text) return "{}";

  // Remove markdown json blocks
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();

  // Find first brace/bracket
  const firstOpenBrace = cleaned.indexOf("{");
  const firstOpenBracket = cleaned.indexOf("[");

  let startIndex = -1;
  let endIndex = -1;

  // Determine if object or array
  if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
    startIndex = firstOpenBrace;
    endIndex = cleaned.lastIndexOf("}");
  } else if (firstOpenBracket !== -1) {
    startIndex = firstOpenBracket;
    endIndex = cleaned.lastIndexOf("]");
  }

  if (startIndex !== -1 && endIndex !== -1) {
    cleaned = cleaned.substring(startIndex, endIndex + 1);
  }

  return cleaned;
}

export interface GenerateWithFallbackOptions {
  task: AITask;
  systemPrompt?: string;
  userPrompt?: string;
  messages?: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  temperature?: number;
  maxOutputTokens?: number;
  responseMode?: AIResponseMode;
  jsonRoot?: AIJsonRoot;
}

function getModelChain(task: AITask): string[] {
  switch (task) {
    case "flashcards_generate":
      return ["openai/gpt-4o-mini", "google/gemini-flash-1.5"];
    case "flashcard_explain":
      return ["openai/gpt-4o-mini", "google/gemini-flash-1.5", "anthropic/claude-3.5-sonnet"];
    case "distractors_generate":
      return ["openai/gpt-4o-mini", "google/gemini-flash-1.5"];
    case "quiz_generate":
      return ["openai/gpt-4o-mini", "google/gemini-flash-1.5"];
    case "fase3_drill_generate":
      return ["openai/gpt-4o-mini", "google/gemini-flash-1.5"];
    case "concept_explain":
      return ["openai/gpt-4o-mini", "google/gemini-flash-1.5", "anthropic/claude-3.5-sonnet"];
    case "sq3r_generate":
      return ["openai/gpt-4o-mini", "google/gemini-flash-1.5"];
    case "sq3r_chapters_extract":
      return ["openai/gpt-4o-mini", "google/gemini-flash-1.5"];
    case "recovery_plan":
      return ["anthropic/claude-3.5-sonnet", "openai/gpt-4o-mini", "google/gemini-flash-1.5"];
    case "reframing_generate":
      return ["openai/gpt-4o-mini", "google/gemini-flash-1.5"];
    case "ocr_images":
      return ["openai/gpt-4o-mini", "google/gemini-flash-1.5"];
    case "oral_exam_question":
      return ["openai/gpt-4o-mini", "google/gemini-flash-1.5"];
    case "oral_exam_evaluate":
      return ["anthropic/claude-3.5-sonnet", "openai/gpt-4o-mini"];
    default:
      return ["openai/gpt-4o-mini", "google/gemini-flash-1.5"];
  }
}

function getDefaultMaxOutputTokens(task: AITask): number {
  switch (task) {
    case "flashcards_generate":
      return 2500;
    case "quiz_generate":
      return 1500;
    case "fase3_drill_generate":
      return 1800;
    case "sq3r_generate":
      return 2200;
    case "sq3r_chapters_extract":
      return 1500;
    case "recovery_plan":
      return 1000;
    case "flashcard_explain":
    case "concept_explain":
      return 700;
    case "reframing_generate":
      return 400;
    case "distractors_generate":
      return 250;
    case "ocr_images":
      return 1200;
    case "oral_exam_question":
      return 500; // Short, focused questions
    case "oral_exam_evaluate":
      return 1500; // Detailed feedback
    default:
      return 1000;
  }
}

function modelSupportsResponseFormat(model: string): boolean {
  return model.startsWith("openai/");
}

function buildMessagesFromPrompts(opts: GenerateWithFallbackOptions): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  if (opts.messages?.length) return opts.messages;
  const systemPrompt = opts.systemPrompt || "";
  const userPrompt = opts.userPrompt || "";
  const msgs: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (systemPrompt) msgs.push({ role: "system", content: systemPrompt });
  msgs.push({ role: "user", content: userPrompt });
  return msgs;
}

function ensureJsonInstructionOnLastUserMessage(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  jsonRoot: AIJsonRoot
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const instruction =
    jsonRoot === "array"
      ? "\n\nRispondi SOLO con un ARRAY JSON valido, senza markdown né testo extra."
      : jsonRoot === "object"
        ? "\n\nRispondi SOLO con un OGGETTO JSON valido, senza markdown né testo extra."
        : "\n\nRispondi SOLO con JSON valido, senza markdown né testo extra.";

  const cloned = [...messages];
  for (let i = cloned.length - 1; i >= 0; i--) {
    const m = cloned[i];
    if (m.role !== "user") continue;
    if (typeof m.content === "string") {
      cloned[i] = { ...m, content: m.content + instruction };
      return cloned;
    }
    if (Array.isArray(m.content)) {
      cloned[i] = {
        ...m,
        content: [...m.content, { type: "text", text: instruction }],
      } as any;
      return cloned;
    }
  }
  cloned.push({ role: "user", content: instruction });
  return cloned;
}

function parseAndValidateJson(text: string, jsonRoot: AIJsonRoot): { ok: true; value: any; raw: string } | { ok: false; error: string; raw: string } {
  const cleaned = cleanJson(text || "");
  try {
    const value = JSON.parse(cleaned);
    if (jsonRoot === "array" && !Array.isArray(value)) {
      return { ok: false, error: "JSON non è un array", raw: cleaned };
    }
    if (jsonRoot === "object" && (value === null || Array.isArray(value) || typeof value !== "object")) {
      return { ok: false, error: "JSON non è un oggetto", raw: cleaned };
    }
    return { ok: true, value, raw: cleaned };
  } catch (e: any) {
    return { ok: false, error: e?.message || "JSON parse error", raw: cleaned };
  }
}

export async function generateWithFallback(options: GenerateWithFallbackOptions): Promise<string> {
  const client = getOpenRouterClient();
  const temperature = options.temperature ?? 0.7;
  const responseMode: AIResponseMode = options.responseMode ?? "text";
  const jsonRoot: AIJsonRoot = options.jsonRoot ?? "any";
  const maxOutputTokens = options.maxOutputTokens ?? getDefaultMaxOutputTokens(options.task);

  const baseMessages = buildMessagesFromPrompts(options);
  const messages = responseMode === "json" ? ensureJsonInstructionOnLastUserMessage(baseMessages, jsonRoot) : baseMessages;
  const chain = getModelChain(options.task);

  const errors: string[] = [];
  for (const model of chain) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxOutputTokens,
        response_format:
          responseMode === "json" && jsonRoot === "object" && modelSupportsResponseFormat(model)
            ? { type: "json_object" }
            : undefined,
      });

      const text = completion.choices[0]?.message?.content || "";
      if (!text) {
        errors.push(`${model}: risposta vuota`);
        continue;
      }

      if (responseMode === "json") {
        const parsed = parseAndValidateJson(text, jsonRoot);
        if (!parsed.ok) {
          errors.push(`${model}: JSON non valido (${parsed.error})`);

          const repairMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            ...messages,
            {
              role: "user",
              content:
                "Il JSON precedente non era valido. Restituisci SOLO JSON valido, senza markdown né testo extra.",
            },
          ];

          try {
            const repaired = await client.chat.completions.create({
              model,
              messages: repairMessages,
              temperature: 0.2,
              max_tokens: maxOutputTokens,
              response_format: modelSupportsResponseFormat(model) ? { type: "json_object" } : undefined,
            });
            const repairedText = repaired.choices[0]?.message?.content || "";
            const repairedParsed = parseAndValidateJson(repairedText, jsonRoot);
            if (repairedParsed.ok) return repairedParsed.raw;
            errors.push(`${model}: JSON repair fallito (${repairedParsed.ok ? "" : repairedParsed.error})`);
            continue;
          } catch (e: any) {
            errors.push(`${model}: JSON repair errore (${e?.message || "errore sconosciuto"})`);
            continue;
          }
        }
        return parsed.raw;
      }

      return text;
    } catch (e: any) {
      errors.push(`${model}: ${e?.message || "errore sconosciuto"}`);
      continue;
    }
  }

  throw new Error(`AI fallita su tutti i modelli. Dettagli: ${errors.join(" | ")}`);
}

export async function generateSpeech(
  text: string,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy",
  options?: { speed?: number; useHD?: boolean }
): Promise<Buffer> {
  // IMPORTANT: OpenRouter does NOT support the audio/speech TTS API.
  // We must use the direct OpenAI client for TTS.
  const directClient = getOpenAIDirectClient();

  if (!directClient) {
    throw new Error("TTS non disponibile: OPENAI_API_KEY non configurata. La voce naturale richiede una chiave API OpenAI diretta.");
  }

  // Default to HD model for more natural, fluid Italian speech
  const useHD = options?.useHD ?? true;
  // Speed: 0.25 to 4.0, default 1.0. Slightly slower (0.95) sounds more natural for Italian
  const speed = options?.speed ?? 0.95;
  const model = useHD ? "tts-1-hd" : "tts-1";

  try {
    console.log(`🎤 Generating TTS (${model}) with voice "${voice}", speed ${speed} for text: "${text.substring(0, 50)}..."`);

    const mp3 = await directClient.audio.speech.create({
      model: model,
      voice: voice,
      input: text,
      speed: speed,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    console.log(`✅ TTS generated successfully, size: ${buffer.length} bytes`);
    return buffer;
  } catch (error: any) {
    console.error("❌ TTS Error:", error.message);

    // Fallback to standard model if HD fails
    if (useHD) {
      try {
        console.log("HD failed, retrying with tts-1 standard model...");
        const mp3 = await directClient.audio.speech.create({
          model: "tts-1",
          voice: voice,
          input: text,
          speed: speed,
        });
        const buffer = Buffer.from(await mp3.arrayBuffer());
        console.log(`✅ TTS (standard) generated successfully, size: ${buffer.length} bytes`);
        return buffer;
      } catch (retryError: any) {
        throw new Error(`TTS Failed: ${error.message} | Standard Retry: ${retryError.message}`);
      }
    }
    throw new Error(`TTS Failed: ${error.message}`);
  }
}

export function makeVisionUserMessage(prompt: string, images: AIImageInput[]): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  return {
    role: "user",
    content: [
      { type: "text", text: prompt },
      ...images.map((img) => ({
        type: "image_url",
        image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
      })),
    ],
  } as any;
}
