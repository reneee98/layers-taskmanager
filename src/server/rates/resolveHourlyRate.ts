/**
 * Resolve hourly rate for a user in a project
 * 
 * Priority:
 * 1. project_members.hourly_rate (override for specific user in project)
 * 2. projects.hourly_rate (project default rate)
 * 3. rates table (user-specific or role-specific, latest valid)
 * 4. Fallback: 0
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface ResolveRateResult {
  hourlyRate: number;
  source: "project_member" | "rates_table" | "fallback";
  rateId?: string;
  rateName?: string;
}

/**
 * Resolve hourly rate for a user in a project
 * 
 * @param userId - UUID of the user
 * @param projectId - UUID of the project
 * @returns Resolved hourly rate with source information
 */
export async function resolveHourlyRate(
  userId: string,
  projectId: string
): Promise<ResolveRateResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Priority 1: Check project_members.hourly_rate
  const { data: projectMember, error: memberError } = await supabase
    .from("project_members")
    .select("hourly_rate")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!memberError && projectMember?.hourly_rate != null) {
    return {
      hourlyRate: Number(projectMember.hourly_rate),
      source: "project_member",
    };
  }

  // Priority 2: Check projects.hourly_rate_cents
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("hourly_rate_cents")
    .eq("id", projectId)
    .maybeSingle();

  if (!projectError && project?.hourly_rate_cents != null) {
    // Convert from cents to dollars
    return {
      hourlyRate: Number(project.hourly_rate_cents) / 100,
      source: "project_member", // Use same source for consistency
    };
  }

  // Priority 3: Check rates table
  // Find the latest valid rate for this user or project
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const { data: rates, error: ratesError } = await supabase
    .from("rates")
    .select("id, name, hourly_rate, user_id, project_id, valid_from, valid_to, is_default")
    .or(`user_id.eq.${userId},project_id.eq.${projectId}`)
    .lte("valid_from", today)
    .or(`valid_to.is.null,valid_to.gte.${today}`)
    .order("is_default", { ascending: false }) // Prefer non-default
    .order("valid_from", { ascending: false }); // Latest first

  if (!ratesError && rates && rates.length > 0) {
    // Prioritize user-specific rate over project-specific
    const userRate = rates.find((r) => r.user_id === userId);
    const rate = userRate || rates[0];

    return {
      hourlyRate: Number(rate.hourly_rate),
      source: "rates_table",
      rateId: rate.id,
      rateName: rate.name,
    };
  }

  // Priority 4: Fallback to 0
  return {
    hourlyRate: 0,
    source: "fallback",
  };
}

/**
 * Resolve hourly rate synchronously (for testing or when you have data)
 * 
 * @param userId - UUID of the user
 * @param projectId - UUID of the project
 * @param projectMember - Project member data (if available)
 * @param rates - Rates data (if available)
 * @returns Resolved hourly rate
 */
export function resolveHourlyRateSync(
  userId: string,
  projectId: string,
  projectMember?: { hourly_rate?: number | null } | null,
  project?: { hourly_rate_cents?: number | null } | null,
  rates?: Array<{
    id: string;
    name: string;
    hourly_rate: number;
    user_id?: string | null;
    project_id?: string | null;
    valid_from: string;
    valid_to?: string | null;
    is_default: boolean;
  }> | null
): ResolveRateResult {
  // Priority 1: project_members.hourly_rate
  if (projectMember?.hourly_rate != null) {
    return {
      hourlyRate: Number(projectMember.hourly_rate),
      source: "project_member",
    };
  }

  // Priority 2: projects.hourly_rate_cents
  if (project?.hourly_rate_cents != null) {
    // Convert from cents to dollars
    return {
      hourlyRate: Number(project.hourly_rate_cents) / 100,
      source: "project_member", // Use same source for consistency
    };
  }

  // Priority 3: rates table
  if (rates && rates.length > 0) {
    const today = new Date().toISOString().split("T")[0];

    // Filter valid rates
    const validRates = rates.filter((rate) => {
      const validFrom = rate.valid_from <= today;
      const validTo = !rate.valid_to || rate.valid_to >= today;
      return validFrom && validTo;
    });

    if (validRates.length > 0) {
      // Prioritize user-specific rate
      const userRate = validRates.find((r) => r.user_id === userId);
      
      // Sort by is_default (false first) and valid_from (desc)
      const sortedRates = [...validRates].sort((a, b) => {
        if (a.is_default !== b.is_default) {
          return a.is_default ? 1 : -1;
        }
        return b.valid_from.localeCompare(a.valid_from);
      });

      const rate = userRate || sortedRates[0];

      return {
        hourlyRate: Number(rate.hourly_rate),
        source: "rates_table",
        rateId: rate.id,
        rateName: rate.name,
      };
    }
  }

  // Priority 4: Fallback
  return {
    hourlyRate: 0,
    source: "fallback",
  };
}

