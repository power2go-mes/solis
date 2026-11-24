import { NextResponse } from "next/server";
import { getPlantOverviewData } from "@/lib/db";

export const dynamic = "force-dynamic";

let cachedOverview: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 10_000; // 10 seconds in-memory cache

export async function GET() {
  const now = Date.now();
  if (cachedOverview && now - cachedOverview.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedOverview.data, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
    });
  }

  try {
    const data = await getPlantOverviewData();
    cachedOverview = { data, timestamp: now };
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
    });
  } catch (err: any) {
    console.error("GET /api/overview error:", err);
    if (cachedOverview) {
      return NextResponse.json(cachedOverview.data);
    }
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
