// CarbonBridge — CBAM Copilot Lambda (AWS Lambda, Node 20+, Function URL).
//
// Calls Claude on Amazon Bedrock via the Converse API. Deploy behind a Function
// URL with CORS, give the role `bedrock:InvokeModel`, and set VITE_COPILOT_URL
// in Amplify to the Function URL. See docs/AWS_DEPLOY.md.
//
// Bedrock model IDs are anthropic.-prefixed. Default is Sonnet (good balance for
// a copilot); set MODEL_ID=anthropic.claude-haiku-4-5 to cut cost, or
// anthropic.claude-opus-4-8 for maximum quality.

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'

const client = new BedrockRuntimeClient({})
const MODEL_ID = process.env.MODEL_ID || 'anthropic.claude-sonnet-4-6'

const SYSTEM = `You are the CarbonBridge CBAM copilot, helping a mid-market EU importer
understand the Carbon Border Adjustment Mechanism. Be concise, accurate, and honest about uncertainty.

Ground rules you must follow:
- The first CBAM payment is due 30 September 2027 (for 2026 imports); 2026 only accrues at a 2.5% CBAM factor, rising to 100% by 2034 as free allocation phases out.
- Independent emissions estimates come from Climate TRACE (modelled satellite + ML, not audited) and are shown as a range with a confidence label — never as a verdict. A "Verification Priority Flag" is a private triage signal, never a public accusation that a company is greenwashing.
- For aluminium, CBAM prices direct + PFC emissions only (~2.5 tCO2e/t), not the ~10-12 cradle-to-gate that's mostly electricity.
- Steel benchmarks: BF/BOF 1.37, DRI/EAF 0.481, scrap EAF 0.072 tCO2e/t.
- We model free allocation via the CBAM phase-in factor, not a separate benchmark deduction.
- Do not invent numbers. If you don't know, say so.`

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
}

export const handler = async (event) => {
  if (event?.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS }
  }
  try {
    const { messages = [] } = JSON.parse(event?.body || '{}')
    const conv = messages
      .filter((m) => m && m.role && m.content)
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: [{ text: String(m.content) }],
      }))
    if (conv.length === 0 || conv[0].role !== 'user') {
      return json(400, { error: 'first message must be from the user' })
    }

    const out = await client.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        system: [{ text: SYSTEM }],
        messages: conv,
        inferenceConfig: { maxTokens: 800, temperature: 0.2 },
      }),
    )
    const text = (out.output?.message?.content || [])
      .map((c) => c.text)
      .filter(Boolean)
      .join('\n')
    return json(200, { text, model: MODEL_ID })
  } catch (e) {
    return json(500, { error: String(e?.message || e) })
  }
}

function json(statusCode, body) {
  return { statusCode, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) }
}
