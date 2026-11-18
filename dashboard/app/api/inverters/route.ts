import { NextRequest, NextResponse } from "next/server";
import { getInverterTelemetries } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId") || "1298491919450797504";

    const inverters = await getInverterTelemetries(stationId);

    return NextResponse.json({
      success: true,
      stationId,
      inverterCount: inverters.length,
      inverters,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
