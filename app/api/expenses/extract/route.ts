import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { base64, mimeType } = await req.json();

    const isPdf = mimeType === 'application/pdf';
    const isImage = mimeType.startsWith('image/');

    if (!isPdf && !isImage) {
      return NextResponse.json({ error: 'Unsupported file type. Upload a PDF, PNG, or JPG.' }, { status: 400 });
    }

    type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    const imageMediaType: ImageMediaType =
      mimeType === 'image/png' ? 'image/png' :
      mimeType === 'image/gif' ? 'image/gif' :
      mimeType === 'image/webp' ? 'image/webp' :
      'image/jpeg';

    const contentBlock = isPdf
      ? ({ type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 } })
      : ({ type: 'image' as const, source: { type: 'base64' as const, media_type: imageMediaType, data: base64 } });

    const today = new Date().toISOString().split('T')[0];

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          contentBlock,
          {
            type: 'text',
            text: `Extract these fields from this receipt or invoice and return ONLY a valid JSON object with exactly these keys:

{
  "vendor_name": "name of the merchant or vendor",
  "expense_date": "date in YYYY-MM-DD format (use ${today} if not visible)",
  "total": "total amount as a plain number string e.g. 42.50",
  "currency_code": "3-letter ISO code e.g. USD EUR GBP MYR SGD AUD CAD",
  "description": "short description of what was purchased (1 sentence)",
  "reference_number": "invoice or receipt number if present, empty string if not"
}

Return ONLY the JSON object. No markdown, no explanation.`,
          },
        ],
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse extracted data from invoice.');

    const extracted = JSON.parse(jsonMatch[0]);
    return NextResponse.json(extracted);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Extraction failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
