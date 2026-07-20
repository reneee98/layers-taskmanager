import { hasPermission } from "@/lib/auth/permissions";

const PROJECT_FINANCIAL_FIELDS = [
  "budget",
  "budget_cents",
  "hourly_rate",
  "hourly_rate_cents",
  "fixed_fee",
] as const;

const TASK_FINANCIAL_FIELDS = [
  "budget_cents",
  "hourly_rate_cents",
  "calculated_price",
] as const;

/** True if the user may see prices/budgets in this workspace. */
export async function canViewFinancialData(
  userId: string,
  workspaceId: string | null | undefined
): Promise<boolean> {
  return hasPermission(userId, "financial", "view_prices", workspaceId ?? null);
}

function stripFields<T extends Record<string, any>>(row: T, fields: readonly string[]): T {
  const clone: Record<string, any> = { ...row };
  for (const field of fields) {
    if (field in clone) clone[field] = null;
  }
  return clone as T;
}

/** Nulls out price/budget fields on project rows for users without financial access. */
export function redactProjectFinancials<T extends Record<string, any>>(projects: T[]): T[] {
  return projects.map((project) => stripFields(project, PROJECT_FINANCIAL_FIELDS));
}

/** Nulls out price/budget fields on task rows (and their embedded project) for users without financial access. */
export function redactTaskFinancials<T extends Record<string, any>>(tasks: T[]): T[] {
  return tasks.map((task) => {
    const redacted: Record<string, any> = stripFields(task, TASK_FINANCIAL_FIELDS);
    if (redacted.project && typeof redacted.project === "object") {
      redacted.project = stripFields(redacted.project, PROJECT_FINANCIAL_FIELDS);
    }
    return redacted as T;
  });
}
