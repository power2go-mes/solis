import { NextRequest, NextResponse } from "next/server";
import { getAlarmLogs } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId") || "1298491919450797504";
    const severity = searchParams.get("severity") || undefined;
    const state = searchParams.get("state") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    const { records, total } = await getAlarmLogs(stationId, {
      severity,
      state,
      search,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      stationId,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      records,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
