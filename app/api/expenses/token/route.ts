import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function accountsDomain(baseUrl: string): string {
  if (baseUrl.includes('.zoho.eu')) return 'https://accounts.zoho.eu';
  if (baseUrl.includes('.zoho.in')) return 'https://accounts.zoho.in';
  if (baseUrl.includes('.zoho.com.au')) return 'https://accounts.zoho.com.au';
  return 'https://accounts.zoho.com';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      grantType: 'authorization_code' | 'refresh_token';
      clientId: string;
      clientSecret: string;
      code?: string;
      refreshToken?: string;
      baseUrl: string;
    };

    const { grantType, clientId, clientSecret, code, refreshToken, baseUrl } = body;
    const domain = accountsDomain(baseUrl);

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: grantType,
    });

    if (grantType === 'authorization_code' && code) {
      params.set('code', code);
      params.set('redirect_uri', '');
    } else if (grantType === 'refresh_token' && refreshToken) {
      params.set('refresh_token', refreshToken);
    } else {
      return NextResponse.json({ error: 'Missing code or refreshToken' }, { status: 400 });
    }

    const resp = await fetch(`${domain}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await resp.json() as {
      access_token?: string;
      refresh_token?: string;
      error?: string;
    };

    if (data.error || !data.access_token) {
      return NextResponse.json({ error: data.error ?? 'Token exchange failed' }, { status: 400 });
    }

    return NextResponse.json({
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken ?? '',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Token request failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
