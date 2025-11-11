import { NextRequest, NextResponse } from "next/server";
import { computeTaskFinance } from "@/server/finance/computeTaskFinance";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    
    const finance = await computeTaskFinance(taskId);

    if (!finance) {
      return NextResponse.json(
        { success: false, error: "Úloha nebola nájdená" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: finance });
  } catch (error) {
    console.error("Task Finance API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Neznáma chyba" 
      },
      { status: 500 }
    );
  }
}


