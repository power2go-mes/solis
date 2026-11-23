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

// GET /api/noc/incidents?status=OPEN,ACKNOWLEDGED
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");

    let query = "SELECT * FROM noc_incidents ORDER BY created_at DESC LIMIT 100";
    let params: any[] = [];

    if (statusParam) {
      const statuses = statusParam.split(",").map(s => s.trim().toUpperCase());
      query = "SELECT * FROM noc_incidents WHERE status = ANY($1) ORDER BY created_at DESC LIMIT 100";
      params = [statuses];
    }

    const res = await pool.query(query, params);
    return NextResponse.json({ success: true, incidents: res.rows });
  } catch (err: any) {
    console.error("GET /api/noc/incidents error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
