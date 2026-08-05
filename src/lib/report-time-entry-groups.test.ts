import { describe, expect, it } from "vitest";
import {
  groupReportTimeEntriesByDescription,
  normalizeTimeEntryDescription,
  type TaskTimeEntriesForReport,
} from "./report-time-entry-groups";

describe("normalizeTimeEntryDescription", () => {
  it("normalizes letter casing and repeated whitespace", () => {
    expect(normalizeTimeEntryDescription("  GraFika   webu ")).toBe("grafika webu");
  });

  it("uses the same key for missing and blank descriptions", () => {
    expect(normalizeTimeEntryDescription(null)).toBe(
      normalizeTimeEntryDescription("   "),
    );
  });
});

describe("groupReportTimeEntriesByDescription", () => {
  it("combines the same note across tasks and sums its hours and amount", () => {
    const taskTimeEntries: TaskTimeEntriesForReport[] = [
      {
        taskId: "task-1",
        taskTitle: "Homepage",
        timeEntries: [
          {
            id: "entry-1",
            date: "2026-08-01",
            description: "Grafika",
            hours: 1.5,
            amount: 75,
            hourly_rate: 50,
            user: { name: "Rene" },
          },
          {
            id: "entry-2",
            date: "2026-08-02",
            description: " grafika ",
            hours: 2,
            amount: 100,
            hourly_rate: 50,
            user: { name: "Rene" },
          },
        ],
      },
      {
        taskId: "task-2",
        taskTitle: "Kampaň",
        timeEntries: [
          {
            id: "entry-3",
            date: "2026-08-03",
            description: "GRAFIKA",
            hours: 0.5,
            amount: 25,
            hourly_rate: 50,
            user: { email: "eva@example.com" },
          },
        ],
      },
    ];

    expect(groupReportTimeEntriesByDescription(taskTimeEntries)).toEqual([
      {
        key: "grafika",
        description: "Grafika",
        hours: 4,
        amount: 200,
        entryCount: 3,
        taskTitles: ["Homepage", "Kampaň"],
        userNames: ["eva@example.com", "Rene"],
      },
    ]);
  });

  it("groups entries without a note under a readable label", () => {
    const taskTimeEntries: TaskTimeEntriesForReport[] = [
      {
        taskId: "task-1",
        taskTitle: "Homepage",
        timeEntries: [
          {
            id: "entry-1",
            date: "2026-08-01",
            description: null,
            hours: 1,
            amount: 0,
            hourly_rate: 0,
          },
          {
            id: "entry-2",
            date: "2026-08-02",
            description: " ",
            hours: 2,
            amount: 0,
            hourly_rate: 0,
          },
        ],
      },
    ];

    expect(groupReportTimeEntriesByDescription(taskTimeEntries)[0]).toMatchObject({
      description: "Bez poznámky",
      hours: 3,
      entryCount: 2,
    });
  });
});
