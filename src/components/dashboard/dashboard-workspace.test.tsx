import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardWorkspace, type DashboardProjectItem } from "./dashboard-workspace";
import type { DashboardTaskItem } from "./dashboard-task-row";

vi.mock("./dashboard-task-row", () => ({
  DashboardTaskRow: ({ task }: { task: DashboardTaskItem }) => <span>{task.title}</span>,
}));
vi.mock("./dashboard-week-planner", () => ({ DashboardWeekPlanner: () => null }));

const project = (id: string, status: string): DashboardProjectItem => ({
  id, name: id, code: null, status,
});
const task = (projectId: string, status: string): DashboardTaskItem => ({
  id: `task-${projectId}`, title: `Úloha ${projectId}`, status, priority: "medium",
  start_date: null, due_date: null, estimated_hours: null, actual_hours: null,
  budget_cents: null, project_id: projectId,
  project: { id: projectId, name: projectId, code: "" },
});
const renderProjects = (projects: DashboardProjectItem[], workspaceTasks: DashboardTaskItem[] = [], showProjects = true) =>
  render(<DashboardWorkspace
    tasks={[]} workspaceTasks={workspaceTasks} projects={projects}
    canUpdateTasks showStats={false} showTasks={false} showProjects={showProjects}
    canViewPrices={false} quickTaskDisabled={false}
    onQuickTask={vi.fn()} onOpenTask={vi.fn()} onUpdateTask={vi.fn()}
    onTimeTracked={vi.fn()}
  />);

describe("dashboard projects", () => {
  it("shows an accessible active project without tasks and lets the member open it", () => {
    renderProjects([project("Pridelený projekt", "active")]);
    expect(screen.getByRole("link", { name: "Otvoriť projekt Pridelený projekt" }))
      .toHaveAttribute("href", "/projects/Pridelený projekt");
    expect(screen.getByText(/0 aktívnych úloh/)).toBeInTheDocument();
    expect(screen.getByText("Projekt zatiaľ nemá aktívne úlohy.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { expanded: true }));
    expect(screen.queryByText("Projekt zatiaľ nemá aktívne úlohy.")).not.toBeInTheDocument();
  });

  it("keeps active projects visible when all their tasks are finished", () => {
    renderProjects([project("Aktívny", "active")], [task("Aktívny", "done")]);
    expect(screen.getByRole("link", { name: "Otvoriť projekt Aktívny" })).toBeInTheDocument();
    expect(screen.queryByText("Úloha Aktívny")).not.toBeInTheDocument();
  });

  it("keeps the project section hidden when project viewing is denied", () => {
    renderProjects([project("Aktívny", "active")], [], false);
    expect(screen.queryByText("Projekty a ich úlohy")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Otvoriť projekt Aktívny" })).not.toBeInTheDocument();
  });

  it("hides completed and cancelled projects even with open tasks", () => {
    renderProjects([
      project("Hotový", "completed"), project("Zrušený", "cancelled"),
    ], [task("Hotový", "todo"), task("Zrušený", "todo")]);
    expect(screen.getByText("Žiadne aktívne projekty")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows assigned drafts and paused projects even without open tasks", () => {
    renderProjects([project("Koncept", "draft"), project("Pozastavený", "on_hold")]);
    expect(screen.getByRole("link", { name: "Otvoriť projekt Koncept" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Otvoriť projekt Pozastavený" })).toBeInTheDocument();
  });

  it("preserves projects with open work and sorts them ahead of empty active projects", () => {
    renderProjects([project("Aktívny", "active"), project("Rozpracovaný", "draft")], [task("Rozpracovaný", "todo")]);
    expect(screen.getAllByRole("link").map(link => link.getAttribute("href")))
      .toEqual(["/projects/Rozpracovaný", "/projects/Aktívny"]);
    expect(screen.getByText("Úloha Rozpracovaný")).toBeInTheDocument();
  });
});
