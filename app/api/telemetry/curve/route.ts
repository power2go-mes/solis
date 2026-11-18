import { NextRequest, NextResponse } from "next/server";
import { getAggregatedChartData } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId") || "1298491919450797504";
    const range = (searchParams.get("range") || "day") as
      | "day"
      | "week"
      | "month"
      | "year"
      | "custom";
    const dateStr = searchParams.get("date") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const chartData = await getAggregatedChartData(
      stationId,
      range,
      dateStr,
      startDate,
      endDate
    );

    return NextResponse.json({
      success: true,
      stationId,
      range,
      date: dateStr || (chartData.timeLabels.length > 0 ? chartData.timeLabels[0] : null),
      chartData,
    });
  } catch (error: any) {
    console.error("Error in /api/telemetry/curve:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
