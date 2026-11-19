import { NextResponse } from "next/server";
import { getPlantOverviewData } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const data = await getPlantOverviewData();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("GET /api/overview error:", err);
    return NextResponse.json(
      {
        success: false,
        summary: {
          currentPowerKw: 0,
          installedCapacityKwp: 0,
          dailyChargeKwh: 0,
          dailyDischargeKwh: 0,
          monthlyChargeMwh: 0,
          monthlyDischargeMwh: 0,
          totalChargeMwh: 0,
          totalDischargeMwh: 0,
          plantCounts: { total: 0, online: 0, alarm: 0, offline: 0 },
        },
        plants: [],
        error: err.message,
      },
      { status: 500 }
    );
  }
}
