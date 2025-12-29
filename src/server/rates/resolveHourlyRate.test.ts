import { describe, it, expect } from "vitest";
import { resolveHourlyRateSync } from "./resolveHourlyRate";

describe("resolveHourlyRate", () => {
  const userId = "user-123";
  const projectId = "project-456";

  describe("Priority 1: project_members.hourly_rate", () => {
    it("should use project_member hourly_rate when available", () => {
      const projectMember = { hourly_rate: 150 };
      const rates = [
        {
          id: "rate-1",
          name: "Senior Developer",
          hourly_rate: 100,
          user_id: userId,
          project_id: null,
          valid_from: "2024-01-01",
          valid_to: null,
          is_default: false,
        },
      ];

      const result = resolveHourlyRateSync(
        userId,
        projectId,
        projectMember,
        rates
      );

      expect(result.hourlyRate).toBe(150);
      expect(result.source).toBe("project_member");
      expect(result.rateId).toBeUndefined();
    });

    it("should handle numeric string hourly_rate", () => {
      const projectMember = { hourly_rate: 120.5 };

      const result = resolveHourlyRateSync(
        userId,
        projectId,
        projectMember,
        []
      );

      expect(result.hourlyRate).toBe(120.5);
      expect(result.source).toBe("project_member");
    });

    it("should skip null project_member hourly_rate", () => {
      const projectMember = { hourly_rate: null };
      const rates = [
        {
          id: "rate-1",
          name: "Default Rate",
          hourly_rate: 80,
          user_id: null,
          project_id: projectId,
          valid_from: "2024-01-01",
          valid_to: null,
          is_default: false,
        },
      ];

      const result = resolveHourlyRateSync(
        userId,
        projectId,
        projectMember,
        rates
      );

      expect(result.hourlyRate).toBe(80);
      expect(result.source).toBe("rates_table");
    });
  });

  describe("Priority 2: rates table", () => {
    it("should use user-specific rate when no project_member rate", () => {
      const rates = [
        {
          id: "rate-1",
          name: "User Rate",
          hourly_rate: 110,
          user_id: userId,
          project_id: null,
          valid_from: "2024-01-01",
          valid_to: null,
          is_default: false,
        },
        {
          id: "rate-2",
          name: "Project Rate",
          hourly_rate: 90,
          user_id: null,
          project_id: projectId,
          valid_from: "2024-01-01",
          valid_to: null,
          is_default: false,
        },
      ];

      const result = resolveHourlyRateSync(userId, projectId, null, rates);

      expect(result.hourlyRate).toBe(110);
      expect(result.source).toBe("rates_table");
      expect(result.rateId).toBe("rate-1");
      expect(result.rateName).toBe("User Rate");
    });

    it("should use latest valid rate", () => {
      const rates = [
        {
          id: "rate-old",
          name: "Old Rate",
          hourly_rate: 80,
          user_id: userId,
          project_id: null,
          valid_from: "2023-01-01",
          valid_to: "2023-12-31",
          is_default: false,
        },
        {
          id: "rate-new",
          name: "New Rate",
          hourly_rate: 120,
          user_id: userId,
          project_id: null,
          valid_from: "2024-01-01",
          valid_to: null,
          is_default: false,
        },
      ];

      const result = resolveHourlyRateSync(userId, projectId, null, rates);

      expect(result.hourlyRate).toBe(120);
      expect(result.rateId).toBe("rate-new");
    });

    it("should filter out expired rates", () => {
      const rates = [
        {
          id: "rate-expired",
          name: "Expired Rate",
          hourly_rate: 200,
          user_id: userId,
          project_id: null,
          valid_from: "2020-01-01",
          valid_to: "2020-12-31",
          is_default: false,
        },
      ];

      const result = resolveHourlyRateSync(userId, projectId, null, rates);

      expect(result.hourlyRate).toBe(0);
      expect(result.source).toBe("fallback");
    });

    it("should prefer non-default rates", () => {
      const rates = [
        {
          id: "rate-default",
          name: "Default Rate",
          hourly_rate: 70,
          user_id: null,
          project_id: projectId,
          valid_from: "2024-01-01",
          valid_to: null,
          is_default: true,
        },
        {
          id: "rate-specific",
          name: "Specific Rate",
          hourly_rate: 95,
          user_id: null,
          project_id: projectId,
          valid_from: "2024-01-01",
          valid_to: null,
          is_default: false,
        },
      ];

      const result = resolveHourlyRateSync(userId, projectId, null, rates);

      expect(result.hourlyRate).toBe(95);
      expect(result.rateId).toBe("rate-specific");
    });

    it("should handle rates without valid_to (open-ended)", () => {
      const rates = [
        {
          id: "rate-1",
          name: "Open Rate",
          hourly_rate: 105,
          user_id: userId,
          project_id: null,
          valid_from: "2024-01-01",
          valid_to: null,
          is_default: false,
        },
      ];

      const result = resolveHourlyRateSync(userId, projectId, null, rates);

      expect(result.hourlyRate).toBe(105);
      expect(result.source).toBe("rates_table");
    });
  });

  describe("Priority 3: Fallback", () => {
    it("should return 0 when no rates available", () => {
      const result = resolveHourlyRateSync(userId, projectId, null, []);

      expect(result.hourlyRate).toBe(0);
      expect(result.source).toBe("fallback");
      expect(result.rateId).toBeUndefined();
      expect(result.rateName).toBeUndefined();
    });

    it("should return 0 when project_member is null and no rates", () => {
      const result = resolveHourlyRateSync(userId, projectId, null, null);

      expect(result.hourlyRate).toBe(0);
      expect(result.source).toBe("fallback");
    });

    it("should return 0 when project_member has null rate and no valid rates", () => {
      const projectMember = { hourly_rate: null };
      const rates = [
        {
          id: "rate-future",
          name: "Future Rate",
          hourly_rate: 150,
          user_id: userId,
          project_id: null,
          valid_from: "2099-01-01",
          valid_to: null,
          is_default: false,
        },
      ];

      const result = resolveHourlyRateSync(
        userId,
        projectId,
        projectMember,
        rates
      );

      expect(result.hourlyRate).toBe(0);
      expect(result.source).toBe("fallback");
    });
  });

  describe("Edge cases", () => {
    it("should handle zero hourly_rate in project_member", () => {
      const projectMember = { hourly_rate: 0 };

      const result = resolveHourlyRateSync(userId, projectId, projectMember, []);

      expect(result.hourlyRate).toBe(0);
      expect(result.source).toBe("project_member");
    });

    it("should handle decimal hourly_rate", () => {
      const rates = [
        {
          id: "rate-1",
          name: "Decimal Rate",
          hourly_rate: 99.99,
          user_id: userId,
          project_id: null,
          valid_from: "2024-01-01",
          valid_to: null,
          is_default: false,
        },
      ];

      const result = resolveHourlyRateSync(userId, projectId, null, rates);

      expect(result.hourlyRate).toBe(99.99);
    });

    it("should prioritize user rate over project rate even if project rate is newer", () => {
      const rates = [
        {
          id: "rate-user",
          name: "User Rate",
          hourly_rate: 100,
          user_id: userId,
          project_id: null,
          valid_from: "2024-01-01",
          valid_to: null,
          is_default: false,
        },
        {
          id: "rate-project",
          name: "Project Rate",
          hourly_rate: 120,
          user_id: null,
          project_id: projectId,
          valid_from: "2024-06-01",
          valid_to: null,
          is_default: false,
        },
      ];

      const result = resolveHourlyRateSync(userId, projectId, null, rates);

      expect(result.hourlyRate).toBe(100);
      expect(result.rateId).toBe("rate-user");
    });
  });
});

