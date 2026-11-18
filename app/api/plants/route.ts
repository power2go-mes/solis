import { NextResponse } from "next/server";
import { getAuthorizedPlants } from "@/lib/db";

export async function GET() {
  try {
    const plants = await getAuthorizedPlants();
    return NextResponse.json({ success: true, plants });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
