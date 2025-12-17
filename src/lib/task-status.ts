export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "review",
  "sent_to_client",
  "done",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Na spracovanie",
  in_progress: "V procese",
  review: "Na kontrole",
  sent_to_client: "Odoslané klientovi",
  done: "Dokončené",
  cancelled: "Zrušené",
};

export const getTaskStatusLabel = (status?: string | null) => {
  if (!status) return "";
  if (status in TASK_STATUS_LABELS) {
    return TASK_STATUS_LABELS[status as TaskStatus];
  }
  return status;
};

/**
 * Replaces task status codes inside double quotes with their user-facing labels.
 * Example: `Zmenil status úlohy z "review" na "sent_to_client"`
 * becomes: `Zmenil status úlohy z "Na kontrole" na "Odoslané klientovi"`
 */
export const formatTextWithTaskStatusLabels = (text?: string | null) => {
  if (!text) return "";
  return text.replace(/"([a-z_]+)"/g, (match, rawStatus: string) => {
    const label = getTaskStatusLabel(rawStatus);
    if (!label || label === rawStatus) return match;
    return `"${label}"`;
  });
};


