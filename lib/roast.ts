import Anthropic from '@anthropic-ai/sdk';
import type { CreativeAnalysis, RoastResult, Categorization } from './roastTypes';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

const SYSTEM_PROMPT = `You are a senior creative strategist at a performance digital marketing agency with deep expertise in consumer psychology, copywriting frameworks, and paid media. You use the ROAST framework — a two-layer scoring system backed by creative effectiveness research. Respond with valid JSON only. Never use em dashes or en dashes in output.`;

let client: Anthropic | null | undefined;

function getClient(): Anthropic | null {
  if (client !== undefined) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  client = apiKey ? new Anthropic({ apiKey }) : null;
  return client;
}

async function fetchAsBase64(url: string): Promise<{ data: string; mediaType: string } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    const mediaType = (contentType.split(';')[0] || contentType).trim();
    const buf = Buffer.from(await resp.arrayBuffer());
    return { data: buf.toString('base64'), mediaType };
  } catch {
    return null;
  }
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? text;
  return JSON.parse(raw.trim());
}

export interface AnalyzeInput {
  imageUrl: string;
  format: string;
  title: string;
  body: string;
}

/**
 * Runs ROAST scoring (per ROAST_FRAMEWORK.md) and creative categorization in a
 * single Claude call to keep cost/latency down. For video ads the imageUrl is
 * the best available still frame (a v1 simplification vs. the framework's
 * 6-frame video sampling, which would need server-side frame extraction).
 */
export async function runCreativeAnalysis(input: AnalyzeInput): Promise<CreativeAnalysis | null> {
  const anthropic = getClient();
  if (!anthropic) {
    console.warn('[roast] ANTHROPIC_API_KEY not set — skipping creative analysis.');
    return null;
  }

  const image = await fetchAsBase64(input.imageUrl);
  if (!image) return null;

  const hookLabel = input.format === 'Video' ? 'Hook / opening frame' : 'Hook Strength';

  const userText = `Analyze this ${input.format} ad creative using the ROAST framework.

Ad headline/title: ${input.title || '(none provided)'}
Ad body copy: ${input.body || '(none provided)'}
Campaign objective: Not set (weight Layer 1 50% / Layer 2 50%)
Note: hook_strength should be labeled "${hookLabel}" in your reasoning.
${input.format === 'Video' ? 'Note: only a single representative still frame is provided, not the full video — factor that uncertainty into hook_strength.' : ''}

Return a single JSON object with exactly these top-level keys: roast_score, roast_verdict, focus_response, layer1, layer2, diagnosis, quadrant, recommendations, categorization.

The first eight keys follow the ROAST output schema exactly (roast_score integer 1-10; layer1/layer2 contain integer dimension scores 1-10 and a decimal average "score"; diagnosis only includes dimensions scoring 7 or below; recommendations includes 3 headline rewrites with distinct strategies plus one cta and one visual recommendation).

Add a ninth key "categorization" — an object with:
- "creative_type": short label for the ad format/style (e.g. "UGC testimonial", "Studio product shot", "Text-overlay promo", "Before/after", "Founder-led")
- "messaging_angle": the core persuasion angle in a few words (e.g. "Price/value", "Social proof", "Urgency/scarcity", "Pain-point agitation", "Aspirational lifestyle")
- "target_audience": a short phrase describing who this creative is speaking to

Respond with JSON only, no markdown fences, no commentary.`;

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: image.mediaType as 'image/jpeg', data: image.data },
            },
            { type: 'text', text: userText },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return null;

    const parsed = extractJson(textBlock.text) as RoastResult & { categorization: Categorization };
    const { categorization, ...roast } = parsed;
    if (!categorization) return null;

    return { roast: roast as RoastResult, categorization };
  } catch (err) {
    console.error('[roast] analysis failed', err);
    return null;
  }
}
