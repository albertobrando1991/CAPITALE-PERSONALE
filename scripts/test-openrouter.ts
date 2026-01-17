
import 'dotenv/config';
import { generateWithFallback } from '../server/services/ai';

// Mock process.env for the test if not present
if (!process.env.OPENROUTER_API_KEY) {
    process.env.OPENROUTER_API_KEY = "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";
    console.log("Using provided OpenRouter Key for testing...");
}

async function testOpenRouter() {
    console.log("=== TEST OPENROUTER INTEGRATION ===");

    // Test 1: Simple text generation (Flashcard style)
    try {
        console.log("\n1. Testing 'flashcard' task (Gemini Flash preferred)...");
        const result = await generateWithFallback({
            task: 'flashcard',
            userPrompt: "Genera una flashcard sulla Rivoluzione Francese.",
            temperature: 0.7
        });
        console.log("✅ Result:", result.substring(0, 100) + "...");
    } catch (error: any) {
        console.error("❌ Flashcard task failed:", error.message);
    }

    // Test 2: JSON generation (Quiz style - OpenAI preferred)
    try {
        console.log("\n2. Testing 'quiz' task (GPT-4o-mini preferred) with JSON mode...");
        const result = await generateWithFallback({
            task: 'quiz',
            userPrompt: "Genera una domanda di storia romana.",
            jsonMode: true,
            temperature: 0.3
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
