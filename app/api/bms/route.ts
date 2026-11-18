import { NextRequest, NextResponse } from "next/server";
import { getBmsTelemetry } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId") || "1298491919450797504";
    const inverterSn = searchParams.get("inverterSn") || undefined;

    const bms = await getBmsTelemetry(stationId, inverterSn);

    return NextResponse.json({
      success: true,
      hasData: !!bms,
      stationId,
      bms,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
