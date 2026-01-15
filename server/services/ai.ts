
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

// Types
export interface AIConfig {
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  geminiApiKey?: string;
  vercelApiKey?: string;
}

// Singleton instances
let openaiClient: OpenAI | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

/**
 * Initializes and returns the OpenAI client.
 * Priority: AI_INTEGRATIONS_OPENAI_API_KEY > OPENAI_API_KEY
 */
export function getOpenAIClient(): OpenAI {
  if (openaiClient) return openaiClient;

  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  openaiClient = new OpenAI({
    apiKey,
    baseURL: baseURL || undefined, // undefined uses default
  });

  return openaiClient;
}

/**
 * Initializes and returns the Gemini client.
 * Priority: GEMINI_API_KEY > GOOGLE_API_KEY
 */
export function getGeminiClient(): GoogleGenerativeAI | null {
  if (geminiClient) return geminiClient;

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  geminiClient = new GoogleGenerativeAI(apiKey);
  return geminiClient;
}

/**
 * Initializes and returns the Vercel AI Gateway client.
 */
export function getVercelGateway() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) return null;
  
  return createOpenAI({
    apiKey: apiKey,
    name: 'vercel-gateway',
  });
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

export interface GenerationOptions {
  systemPrompt: string;
  userPrompt: string;
  model?: string; // For OpenAI
  jsonMode?: boolean; // If true, tries to enforce JSON output
  temperature?: number;
}

/**
 * Generates text using a fallback strategy: Gemini -> Vercel -> OpenAI.
 */
export async function generateWithFallback(options: GenerationOptions): Promise<string> {
  const { systemPrompt, userPrompt, jsonMode = false, temperature = 0.7 } = options;
  let result: string | null = null;
  let errors: string[] = [];

  // 1. Try Gemini
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      console.log("[AI] Trying Gemini...");
      const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `${systemPrompt}\n\n${userPrompt}${jsonMode ? "\nReturn ONLY valid JSON." : ""}`;
      
      const response = await model.generateContent(prompt);
      result = response.response.text();
      
      if (result) {
        if (jsonMode) result = cleanJson(result);
        return result;
      }
    } catch (err: any) {
      console.error("[AI] Gemini failed:", err.message);
      errors.push(`Gemini: ${err.message}`);
    }
  }

  // 2. Try Vercel AI Gateway
  const vercel = getVercelGateway();
  if (vercel && !result) {
    try {
      console.log("[AI] Trying Vercel AI Gateway...");
      const { text } = await generateText({
        model: vercel('gpt-4o'),
        system: systemPrompt,
        prompt: userPrompt + (jsonMode ? "\nReturn ONLY valid JSON." : ""),
        temperature,
      });
      
      if (text) {
        result = text;
        if (jsonMode) result = cleanJson(result);
        return result;
      }
    } catch (err: any) {
      console.error("[AI] Vercel Gateway failed:", err.message);
      errors.push(`Vercel: ${err.message}`);
    }
  }

  // 3. Try OpenAI
  try {
    const openai = getOpenAIClient();
    console.log("[AI] Trying OpenAI...");
    
    const completion = await openai.chat.completions.create({
      model: options.model || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: jsonMode ? { type: "json_object" } : undefined,
      temperature,
    });

    result = completion.choices[0]?.message?.content;
    
    if (result) {
      if (jsonMode) result = cleanJson(result);
      return result;
    }
  } catch (err: any) {
    console.error("[AI] OpenAI failed:", err.message);
    errors.push(`OpenAI: ${err.message}`);
  }

  throw new Error(`AI Generation failed with all providers. Errors: ${errors.join("; ")}`);
}
