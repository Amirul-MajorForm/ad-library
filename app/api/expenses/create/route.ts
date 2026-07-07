import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ExpensePayload {
  expense_date: string;
  total: string;
  vendor_name: string;
  description: string;
  currency_code: string;
  reference_number: string;
  account_id?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { token, orgId, baseUrl, expense } = (await req.json()) as {
      token: string;
      orgId: string;
      baseUrl: string;
      expense: ExpensePayload;
    };

    const body: Record<string, unknown> = {
      expense_date: expense.expense_date,
      total: parseFloat(expense.total),
      currency_code: expense.currency_code,
      vendor_name: expense.vendor_name,
      description: expense.description,
    };

    if (expense.account_id) body.account_id = expense.account_id;
    if (expense.reference_number) body.reference_number = expense.reference_number;

    const resp = await fetch(`${baseUrl}/api/v1/expenses`, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'X-com-zoho-expense-organizationid': orgId,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ JSONString: JSON.stringify(body) }).toString(),
    });

    const data = (await resp.json()) as {
      code: number;
      message?: string;
      expense?: { expense_id: string; expense_number?: string };
    };

    if (data.code !== 0) {
      return NextResponse.json(
        { error: data.message || `Zoho returned code ${data.code}` },
        { status: 400 },
      );
    }

    return NextResponse.json({
      expense_id: data.expense?.expense_id ?? '',
      expense_number: data.expense?.expense_number ?? '',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create expense';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
