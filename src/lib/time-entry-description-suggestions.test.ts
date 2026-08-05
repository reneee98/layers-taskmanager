import { describe, expect, it } from "vitest";

import {
  buildTimeEntryDescriptionSuggestions,
  sortFrequentDescriptionSuggestions,
  sortTaskDescriptionSuggestions,
} from "@/lib/time-entry-description-suggestions";

describe("buildTimeEntryDescriptionSuggestions", () => {
  it("spojí rovnaké poznámky bez ohľadu na veľkosť písmen a medzery", () => {
    const suggestions = buildTimeEntryDescriptionSuggestions([
      { description: " Grafika ", created_at: "2026-08-01T10:00:00.000Z" },
      { description: "grafika", created_at: "2026-08-02T10:00:00.000Z" },
      { description: "Grafika   webu", created_at: "2026-08-03T10:00:00.000Z" },
      { description: "   ", created_at: "2026-08-04T10:00:00.000Z" },
    ]);

    expect(suggestions).toEqual([
      {
        value: "grafika",
        count: 2,
        lastUsedAt: "2026-08-02T10:00:00.000Z",
      },
      {
        value: "Grafika webu",
        count: 1,
        lastUsedAt: "2026-08-03T10:00:00.000Z",
      },
    ]);
  });
});

describe("zoradenie návrhov poznámok", () => {
  const suggestions = [
    { value: "Konzultácia", count: 5, lastUsedAt: "2026-07-20T10:00:00.000Z" },
    { value: "Grafika", count: 2, lastUsedAt: "2026-08-04T10:00:00.000Z" },
  ];

  it("v úlohe uprednostní naposledy použitú poznámku", () => {
    expect(sortTaskDescriptionSuggestions(suggestions)[0].value).toBe("Grafika");
  });

  it("vo workspace uprednostní najčastejšiu poznámku", () => {
    expect(sortFrequentDescriptionSuggestions(suggestions)[0].value).toBe("Konzultácia");
  });
});
