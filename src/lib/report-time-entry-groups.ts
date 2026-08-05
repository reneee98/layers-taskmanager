export interface ReportTimeEntryUser {
  name?: string | null;
  email?: string | null;
}

export interface ReportTimeEntry {
  id: string;
  date: string;
  description?: string | null;
  hours: number;
  amount: number;
  hourly_rate: number;
  user?: ReportTimeEntryUser | null;
}

export interface TaskTimeEntriesForReport {
  taskId: string;
  taskTitle: string;
  timeEntries: ReportTimeEntry[];
}

export interface ReportTimeEntryGroup {
  key: string;
  description: string;
  hours: number;
  amount: number;
  entryCount: number;
  taskTitles: string[];
  userNames: string[];
}

const WITHOUT_DESCRIPTION_KEY = "__without-description__";

const cleanDescription = (description?: string | null) =>
  description?.trim().replace(/\s+/g, " ") || "";

export const normalizeTimeEntryDescription = (description?: string | null) => {
  const cleanedDescription = cleanDescription(description);

  if (!cleanedDescription) {
    return WITHOUT_DESCRIPTION_KEY;
  }

  return cleanedDescription.normalize("NFKC").toLocaleLowerCase("sk");
};

export const groupReportTimeEntriesByDescription = (
  taskTimeEntries: TaskTimeEntriesForReport[],
): ReportTimeEntryGroup[] => {
  const groups = new Map<
    string,
    ReportTimeEntryGroup & { taskTitleSet: Set<string>; userNameSet: Set<string> }
  >();

  taskTimeEntries.forEach(({ taskTitle, timeEntries }) => {
    timeEntries.forEach((entry) => {
      const key = normalizeTimeEntryDescription(entry.description);
      const cleanedDescription = cleanDescription(entry.description);
      const userName = entry.user?.name || entry.user?.email || "Neznámy";
      const existingGroup = groups.get(key);

      if (existingGroup) {
        existingGroup.hours += Number(entry.hours) || 0;
        existingGroup.amount += Number(entry.amount) || 0;
        existingGroup.entryCount += 1;
        existingGroup.taskTitleSet.add(taskTitle);
        existingGroup.userNameSet.add(userName);
        return;
      }

      groups.set(key, {
        key,
        description: cleanedDescription || "Bez poznámky",
        hours: Number(entry.hours) || 0,
        amount: Number(entry.amount) || 0,
        entryCount: 1,
        taskTitles: [],
        userNames: [],
        taskTitleSet: new Set([taskTitle]),
        userNameSet: new Set([userName]),
      });
    });
  });

  return Array.from(groups.values())
    .map(({ taskTitleSet, userNameSet, ...group }) => ({
      ...group,
      taskTitles: Array.from(taskTitleSet).sort((a, b) => a.localeCompare(b, "sk")),
      userNames: Array.from(userNameSet).sort((a, b) => a.localeCompare(b, "sk")),
    }))
    .sort(
      (a, b) =>
        b.hours - a.hours || a.description.localeCompare(b.description, "sk"),
    );
};
