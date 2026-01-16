import 'dotenv/config'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) return { ok: false, provider: 'gemini', error: 'GEMINI_API_KEY mancante' }
  const client = new GoogleGenerativeAI(apiKey)
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']
  for (const m of models) {
    try {
      const model = client.getGenerativeModel({ model: m })
      const res = await model.generateContent([{ text: 'Rispondi con: OK' }])
      const text = res.response.text().trim()
      if (text) return { ok: true, provider: 'gemini', model: m, output: text }
    } catch (e: any) {
      console.log(`[DEBUG] Gemini ${m} failed:`, e.message)
      // try next
    }
  }
  return { ok: false, provider: 'gemini', error: 'Tutti i modelli hanno fallito' }
}

async function testVercelGateway() {
  const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_API_KEY
  const baseURL = process.env.AI_GATEWAY_BASE_URL || process.env.VERCEL_AI_BASE_URL
  if (!apiKey || !baseURL) return { ok: false, provider: 'vercel-gateway', error: 'AI_GATEWAY_API_KEY o BASE_URL mancante' }
  try {
    const client = new OpenAI({ apiKey, baseURL })
    const res = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Rispondi con: OK' }],
      temperature: 0.1,
    })
    const text = res.choices?.[0]?.message?.content?.trim()
    return { ok: !!text, provider: 'vercel-gateway', model: 'gpt-4o', output: text || '' }
  } catch (e: any) {
    return { ok: false, provider: 'vercel-gateway', error: e.message }
  }
}

async function testVercelGeminiViaGateway() {
  const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_API_KEY
  const baseURL = process.env.AI_GATEWAY_BASE_URL || process.env.VERCEL_AI_BASE_URL
  if (!apiKey || !baseURL) return { ok: false, provider: 'vercel-gateway-google', error: 'AI_GATEWAY_API_KEY o BASE_URL mancante' }
  try {
    const client = new OpenAI({ apiKey, baseURL })
    const res = await client.chat.completions.create({
      model: 'google/gemini-1.5-flash-latest',
      messages: [{ role: 'user', content: 'Rispondi con: OK' }],
      temperature: 0.1,
    })
    const text = res.choices?.[0]?.message?.content?.trim()
    return { ok: !!text, provider: 'vercel-gateway-google', model: 'google/gemini-1.5-flash-latest', output: text || '' }
  } catch (e: any) {
    return { ok: false, provider: 'vercel-gateway-google', error: e.message }
  }
}

async function testOpenAI() {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) return { ok: false, provider: 'openai', error: 'OPENAI_API_KEY mancante' }
  try {
    const client = new OpenAI({ apiKey })
    const res = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Rispondi con: OK' }],
      temperature: 0.1,
    })
    const text = res.choices?.[0]?.message?.content?.trim()
    return { ok: !!text, provider: 'openai', model: 'gpt-4o', output: text || '' }
  } catch (e: any) {
    return { ok: false, provider: 'openai', error: e.message }
  }
}

;(async () => {
  console.log('=== Test Configurazione AI ===')
  console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅' : '❌')
  console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? '✅' : '❌')
  console.log('- AI_GATEWAY_API_KEY:', process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_API_KEY ? '✅' : '❌')
  console.log('- AI_GATEWAY_BASE_URL:', process.env.AI_GATEWAY_BASE_URL || process.env.VERCEL_AI_BASE_URL ? '✅' : '❌')

  const results = [] as any[]
  results.push(await testGemini())
  results.push(await testVercelGateway())
  results.push(await testVercelGeminiViaGateway())
  results.push(await testOpenAI())

  console.log('\n=== Risultati ===')
  for (const r of results) {
    console.log(`${r.provider}:`, r.ok ? `✅ model=${r.model} output=${r.output}` : `❌ ${r.error}`)
  }
  const allOk = results.every(r => r.ok)
  process.exit(allOk ? 0 : 1)
})()
