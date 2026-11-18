import { NextRequest, NextResponse } from "next/server";
import { getDailyEnergy } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId") || "1298491919450797504";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const records = await getDailyEnergy(stationId, startDate, endDate);

    return NextResponse.json({
      success: true,
      stationId,
      recordsCount: records.length,
      records,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
