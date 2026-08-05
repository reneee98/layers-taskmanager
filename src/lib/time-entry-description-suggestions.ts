import { normalizeTimeEntryDescription } from "@/lib/report-time-entry-groups";

export interface TimeEntryDescriptionRow {
  description: string | null;
  created_at: string | null;
}

export interface TimeEntryDescriptionSuggestion {
  value: string;
  count: number;
  lastUsedAt: string | null;
}

const cleanDescription = (description: string | null) =>
  description?.trim().replace(/\s+/g, " ") || "";

export const buildTimeEntryDescriptionSuggestions = (
  rows: TimeEntryDescriptionRow[]
): TimeEntryDescriptionSuggestion[] => {
  const suggestions = new Map<string, TimeEntryDescriptionSuggestion>();

  rows.forEach((row) => {
    const value = cleanDescription(row.description);
    if (!value) return;

    const key = normalizeTimeEntryDescription(value);
    const existingSuggestion = suggestions.get(key);

    if (!existingSuggestion) {
      suggestions.set(key, {
        value,
        count: 1,
        lastUsedAt: row.created_at,
      });
      return;
    }

    existingSuggestion.count += 1;

    if (
      row.created_at &&
      (!existingSuggestion.lastUsedAt || row.created_at > existingSuggestion.lastUsedAt)
    ) {
      existingSuggestion.value = value;
      existingSuggestion.lastUsedAt = row.created_at;
    }
  });

  return Array.from(suggestions.values());
};

export const sortTaskDescriptionSuggestions = (suggestions: TimeEntryDescriptionSuggestion[]) =>
  [...suggestions].sort(
    (a, b) =>
      (b.lastUsedAt || "").localeCompare(a.lastUsedAt || "") ||
      b.count - a.count ||
      a.value.localeCompare(b.value, "sk")
  );

export const sortFrequentDescriptionSuggestions = (suggestions: TimeEntryDescriptionSuggestion[]) =>
  [...suggestions].sort(
    (a, b) =>
      b.count - a.count ||
      (b.lastUsedAt || "").localeCompare(a.lastUsedAt || "") ||
      a.value.localeCompare(b.value, "sk")
  );
