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

// POST /api/noc/resolve
export async function POST(req: Request) {
  try {
    const { incidentId, operatorName, resolutionNotes } = await req.json();
    if (!incidentId || !resolutionNotes) {
      return NextResponse.json({ error: "Missing incidentId or resolutionNotes" }, { status: 400 });
    }

    const res = await pool.query(
      `UPDATE noc_incidents
       SET status = 'RESOLVED',
           resolved_by = $1,
           resolved_at = NOW(),
           resolution_notes = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *;`,
      [operatorName || "NOC Operator", resolutionNotes, incidentId]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, incident: res.rows[0] });
  } catch (err: any) {
    console.error("POST /api/noc/resolve error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
