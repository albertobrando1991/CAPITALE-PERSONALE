
import 'dotenv/config';
import { generateWithFallback } from '../server/services/ai';

if (!process.env.OPENROUTER_API_KEY && !process.env.OPEN_ROUTER_API_KEY && !process.env.OPEN_ROUTER) {
    throw new Error("OPENROUTER_API_KEY non configurata. Imposta la chiave nel tuo .env prima di eseguire questo script.");
}

async function testOpenRouter() {
    console.log("=== TEST OPENROUTER INTEGRATION ===");

    // Test 1: Simple text generation (Flashcard style)
    try {
        console.log("\n1. Testing 'flashcards_generate' task...");
        const result = await generateWithFallback({
            task: 'flashcards_generate',
            userPrompt: "Genera una flashcard sulla Rivoluzione Francese.",
            responseMode: "json",
            jsonRoot: "array",
            temperature: 0.3,
            maxOutputTokens: 500
        });
        console.log("✅ Result:", result.substring(0, 100) + "...");
    } catch (error: any) {
        console.error("❌ Flashcard task failed:", error.message);
    }

    // Test 2: JSON generation (Quiz style - OpenAI preferred)
    try {
        console.log("\n2. Testing 'quiz_generate' task with JSON mode...");
        const result = await generateWithFallback({
            task: 'quiz_generate',
            userPrompt: "Genera una domanda di storia romana.",
            responseMode: "json",
            jsonRoot: "array",
            temperature: 0.3,
            maxOutputTokens: 600
        });
        console.log("✅ Result:", result);
    } catch (error: any) {
        console.error("❌ Quiz task failed:", error.message);
    }

     // Test 3: Complex Reasoning (Claude preferred)
     try {
        console.log("\n3. Testing 'recovery_plan' task (Claude Sonnet preferred)...");
        const result = await generateWithFallback({
            task: 'recovery_plan',
            userPrompt: "Analizza questo errore: ho confuso la data della scoperta dell'America.",
            temperature: 0.5
        });
        console.log("✅ Result:", result.substring(0, 100) + "...");
    } catch (error: any) {
        console.error("❌ Recovery Plan task failed:", error.message);
    }
}

testOpenRouter();
