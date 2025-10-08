import { NextRequest, NextResponse } from "next/server";
import { computeProjectFinance } from "@/server/finance/computeProjectFinance";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("task_id");
    
    const finance = await computeProjectFinance(id, taskId || undefined);

    if (!finance) {
      return NextResponse.json(
        { success: false, error: "Projekt nebol nájdený" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: finance });
  } catch (error) {
    console.error("Finance API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Neznáma chyba" 
      },
      { status: 500 }
    );
  }
}

