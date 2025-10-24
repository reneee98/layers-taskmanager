import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BillingItem } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'unbilled';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate status parameter
    if (!['unbilled', 'billed', 'excluded'].includes(status)) {
      return NextResponse.json({ error: "Invalid status parameter" }, { status: 400 });
    }

    // Get billing items from view
    const { data: billingItems, error } = await supabase
      .from('billing_items')
      .select('*')
      .eq('bill_status', status)
      .order('completed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching billing items:', error);
      return NextResponse.json({ error: "Failed to fetch billing items" }, { status: 500 });
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('billing_items')
      .select('*', { count: 'exact', head: true })
      .eq('bill_status', status);

    return NextResponse.json({
      success: true,
      data: billingItems as BillingItem[],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error('Error in billing items API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
