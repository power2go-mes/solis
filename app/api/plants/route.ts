import { NextResponse } from "next/server";
import { getAuthorizedPlants } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const plants = await getAuthorizedPlants();
    return NextResponse.json(
      { success: true, plants },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
