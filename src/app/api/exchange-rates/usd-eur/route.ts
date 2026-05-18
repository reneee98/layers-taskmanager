import { NextResponse } from "next/server";
import { getUsdEurExchangeRate } from "@/server/exchange-rates/getUsdEurExchangeRate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rate = await getUsdEurExchangeRate();
    return NextResponse.json({ success: true, data: rate });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Nepodarilo sa načítať kurz USD/EUR",
      },
      { status: 500 }
    );
  }
}
