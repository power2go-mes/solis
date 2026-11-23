import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    "postgresql://postgres.jimlvgbbgomrhaqrzllx:Abdul1367453390@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { subscription, userAgent } = await req.json();
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    await pool.query(
      `INSERT INTO web_push_subscriptions (endpoint, p256dh, auth, user_agent, last_notified_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (endpoint) DO UPDATE 
       SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent, last_notified_at = NOW();`,
      [endpoint, p256dh, auth, userAgent || "Unknown"]
    );

    return NextResponse.json({ success: true, message: "Subscription saved successfully" });
  } catch (error: any) {
    console.error("Failed to save push subscription:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
