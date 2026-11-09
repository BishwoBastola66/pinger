import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  // Prevent unauthorized access
  const authHeader = req.headers.get('authorization');
  const expectedSecret = process.env.WORKER_TRIGGER_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await db.execute(sql`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS scopes jsonb DEFAULT '["monitors:read"]'::jsonb NOT NULL;`);
    return NextResponse.json({ success: true, message: 'Column migration verified' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

