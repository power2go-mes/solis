import { NextRequest, NextResponse } from "next/server";
import { executeLiveSync } from "@/lib/syncEngine";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allows up to 60s execution on Vercel

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const expectedKey = process.env.CRON_SECRET || "solis2026";

    if (expectedKey && key !== expectedKey) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Pass ?key=solis2026" },
        { status: 401 }
      );
    }

    const result = await executeLiveSync();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error: any) {
    console.error("Error in /api/sync:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
