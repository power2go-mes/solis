import { NextRequest, NextResponse } from "next/server";
import { getMonthlyEnergyBreakdown, getAnnualEnergyBreakdown } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId") || "1298491919450797504";
    const period = (searchParams.get("period") || "month") as "month" | "year";
    const date = searchParams.get("date") || undefined;

    let data;
    if (period === "year") {
      data = await getAnnualEnergyBreakdown(stationId, date);
    } else {
      data = await getMonthlyEnergyBreakdown(stationId, date);
    }

    return NextResponse.json(
      {
        success: true,
        stationId,
        period,
        data,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error: any) {
    console.error("Error in /api/energy/breakdown:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
