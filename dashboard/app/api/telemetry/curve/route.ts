import { NextRequest, NextResponse } from "next/server";
import { getPlantPowerCurve } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId") || "1298491919450797504";
    const dateStr = searchParams.get("date") || undefined;

    const points = await getPlantPowerCurve(stationId, dateStr);

    return NextResponse.json({
      success: true,
      stationId,
      date: dateStr || (points.length > 0 ? points[0].curve_date : null),
      pointsCount: points.length,
      points,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
