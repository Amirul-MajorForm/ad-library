import { NextRequest, NextResponse } from 'next/server';
import { buildUrl, fetchGraph, MetaApiRequestError } from '@/lib/metaClient';
import type { MetaAdAccount } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-meta-token')?.trim();
  if (!token || token.length < 10) {
    return NextResponse.json(
      { error: { message: 'Missing or invalid Meta API token.' } },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const url = buildUrl('/me/adaccounts', {
      fields: 'id,name,account_id',
      limit: '100',
      access_token: token,
    });
    const data = await fetchGraph<{ data: MetaAdAccount[] }>(url);
    return NextResponse.json({ accounts: data.data || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (err instanceof MetaApiRequestError) {
      return NextResponse.json(
        { error: { message: err.message, code: err.fbError?.code, fbtrace_id: err.fbError?.fbtrace_id } },
        { status: err.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return NextResponse.json(
      { error: { message: 'Unexpected error fetching ad accounts.' } },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
