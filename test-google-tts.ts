import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { writeFileSync } from "fs";

async function testGoogleTTS() {
    try {
        const client = new TextToSpeechClient({
            keyFilename: "./google-tts-credentials.json",
        });

        console.log("✅ Google TTS Client initialized");

        const [response] = await client.synthesizeSpeech({
            input: { text: "Buongiorno, iniziamo l'esame orale. Mi parli del diritto amministrativo italiano." },
            voice: {
                languageCode: "it-IT",
                name: "it-IT-Neural2-C",
            },
            audioConfig: {
                audioEncoding: "MP3",
                speakingRate: 1.0,
            },
        });

        if (response.audioContent) {
            writeFileSync("test-voice-professor.mp3", response.audioContent, "binary");
            console.log("✅ Audio generated: test-voice-professor.mp3");
            console.log("🎧 Ascolta il file per verificare la voce italiana!");
        }
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

testGoogleTTS();
