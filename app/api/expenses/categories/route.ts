import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { token, orgId, baseUrl } = await req.json();

    const resp = await fetch(`${baseUrl}/api/v1/expenseaccounts`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'X-com-zoho-expense-organizationid': orgId,
      },
    });

    if (!resp.ok) return NextResponse.json({ categories: [] });

    const data = await resp.json();
    if (data.code !== 0) return NextResponse.json({ categories: [] });

    const categories = ((data.expense_accounts ?? []) as Array<{ account_id: string; account_name: string }>)
      .map((a) => ({ id: a.account_id, name: a.account_name }));

    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ categories: [] });
  }
}
