import { NextRequest, NextResponse } from "next/server";
import { getLatestTelemetry } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId") || "1298491919450797504";

    const telemetry = await getLatestTelemetry(stationId);
    if (!telemetry) {
      return NextResponse.json(
        {
          success: true,
          hasData: false,
          message: "No telemetry records found in Supabase for this plant.",
          telemetry: null,
        },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    return NextResponse.json(
      {
        success: true,
        hasData: true,
        telemetry,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
