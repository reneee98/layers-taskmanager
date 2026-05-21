#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

loadDotenv({ path: ".env.local", quiet: true });
loadDotenv({ path: ".env", quiet: true });

const TASK_STATUSES = ["todo", "in_progress", "review", "sent_to_client", "done", "cancelled"];
const TASK_PRIORITIES = ["low", "medium", "high", "urgent"];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_LIST_LIMIT = 100;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
const WORKSPACE_ID = process.env.LAYERS_MCP_WORKSPACE_ID?.trim() || "";
const ACTOR_USER_ID = process.env.LAYERS_MCP_ACTOR_USER_ID?.trim() || null;

let cachedSupabaseClient = null;

function assertConfigured() {
  const missing = [];

  if (!SUPABASE_URL) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!WORKSPACE_ID) {
    missing.push("LAYERS_MCP_WORKSPACE_ID");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }
}

function getSupabase() {
  assertConfigured();

  if (!cachedSupabaseClient) {
    cachedSupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return cachedSupabaseClient;
}

const supabase = new Proxy(
  {},
  {
    get(_target, property) {
      const client = getSupabase();
      const value = client[property];
      return typeof value === "function" ? value.bind(client) : value;
    },
  }
);

function isUuid(value) {
  return UUID_REGEX.test(value);
}

function createTextResult(text) {
  return {
    content: [{ type: "text", text }],
  };
}

function createJsonResult(label, data) {
  return createTextResult(`${label}\n\n${JSON.stringify(data, null, 2)}`);
}

function createErrorResult(error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

function tool(handler) {
  return async (input) => {
    try {
      assertConfigured();
      return await handler(input);
    } catch (error) {
      console.error("[layers-tasks-mcp] Tool error:", error);
      return createErrorResult(error);
    }
  };
}

function normalizeNullableText(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decodeBasicHtmlEntities(value) {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function stripHtmlToPlainText(value) {
  return decodeBasicHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|h1|h2|h3|h4|h5|h6|blockquote|pre)>/gi, "\n\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeDescriptionSource(value) {
  if (!value) {
    return "";
  }

  const text = /<[^>]+>/.test(value) ? stripHtmlToPlainText(value) : value;
  return text.replace(/\r\n/g, "\n").trim();
}

function createDescriptionBlock(type, overrides = {}) {
  return {
    type,
    level: 0,
    text: "",
    items: [],
    ...overrides,
  };
}

function toCentsFromEuro(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return Math.round(value * 100);
}

function toIsoOrNull(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }

  return date.toISOString();
}

function clampLimit(limit) {
  return Math.min(Math.max(limit ?? 25, 1), MAX_LIST_LIMIT);
}

function escapeLike(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll(",", "\\,");
}

function formatProject(project) {
  return {
    id: project.id,
    name: project.name,
    code: project.code,
    status: project.status,
    hourly_rate_cents: project.hourly_rate_cents,
    budget_cents: project.budget_cents,
    client_id: project.client_id,
  };
}

function formatTask(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    color: task.color,
    project_id: task.project_id,
    parent_task_id: task.parent_task_id,
    due_date: task.due_date,
    start_date: task.start_date,
    end_date: task.end_date,
    estimated_hours: task.estimated_hours,
    actual_hours: task.actual_hours,
    hourly_rate_cents: task.hourly_rate_cents,
    budget_cents: task.budget_cents,
    budget_amount: task.budget_amount,
    created_at: task.created_at,
    updated_at: task.updated_at,
  };
}

function formatProfile(profile) {
  return {
    id: profile.id,
    display_name: profile.display_name,
    email: profile.email,
    role: profile.role,
  };
}

function formatComment(comment) {
  return {
    id: comment.id,
    task_id: comment.task_id,
    user_id: comment.user_id,
    content: comment.content,
    created_at: comment.created_at,
    updated_at: comment.updated_at,
  };
}

function formatChecklistItem(item) {
  return {
    id: item.id,
    task_id: item.task_id,
    text: item.text,
    completed: item.completed,
    position: item.position,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

function renderTextWithLineBreaks(value) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function renderDescriptionBlocksToHtml(blocks) {
  const htmlParts = [];

  for (const block of blocks) {
    if (!block || typeof block !== "object") {
      continue;
    }

    if (block.type === "heading") {
      const level = [1, 2, 3].includes(block.level) ? block.level : 2;
      const text = typeof block.text === "string" ? block.text.trim() : "";
      if (text) {
        htmlParts.push(`<h${level}>${escapeHtml(text)}</h${level}>`);
      }
      continue;
    }

    if (block.type === "paragraph") {
      const text = typeof block.text === "string" ? block.text.trim() : "";
      if (text) {
        htmlParts.push(`<p>${renderTextWithLineBreaks(text)}</p>`);
      }
      continue;
    }

    if (block.type === "bullet_list" || block.type === "numbered_list") {
      const items = Array.isArray(block.items)
        ? block.items.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
        : [];

      if (items.length > 0) {
        const tag = block.type === "numbered_list" ? "ol" : "ul";
        htmlParts.push(
          `<${tag}>${items.map((item) => `<li>${renderTextWithLineBreaks(item)}</li>`).join("")}</${tag}>`
        );
      }
      continue;
    }

    if (block.type === "quote") {
      const text = typeof block.text === "string" ? block.text.trim() : "";
      if (text) {
        htmlParts.push(`<blockquote><p>${renderTextWithLineBreaks(text)}</p></blockquote>`);
      }
      continue;
    }

    if (block.type === "code") {
      const text = typeof block.text === "string" ? block.text.trim() : "";
      if (text) {
        htmlParts.push(`<pre><code>${escapeHtml(text)}</code></pre>`);
      }
    }
  }

  return htmlParts.join("");
}

function parseStructuredDescription(input) {
  const sourceText = normalizeDescriptionSource(input);
  if (!sourceText) {
    return [];
  }

  const lines = sourceText.split("\n");
  const blocks = [];
  let paragraphLines = [];
  let listType = null;
  let listItems = [];
  let quoteLines = [];
  let codeLines = [];
  let inCodeBlock = false;

  const flushParagraph = () => {
    const text = paragraphLines.join("\n").trim();
    if (text) {
      blocks.push(createDescriptionBlock("paragraph", { text }));
    }
    paragraphLines = [];
  };

  const flushList = () => {
    if (listType && listItems.length > 0) {
      blocks.push(createDescriptionBlock(listType, { items: [...listItems] }));
    }
    listType = null;
    listItems = [];
  };

  const flushQuote = () => {
    const text = quoteLines.join("\n").trim();
    if (text) {
      blocks.push(createDescriptionBlock("quote", { text }));
    }
    quoteLines = [];
  };

  const flushCode = () => {
    const text = codeLines.join("\n").trimEnd();
    if (text) {
      blocks.push(createDescriptionBlock("code", { text }));
    }
    codeLines = [];
  };

  const flushAllOpenBlocks = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushParagraph();
      flushList();
      flushQuote();
      if (inCodeBlock) {
        flushCode();
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushAllOpenBlocks();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushAllOpenBlocks();
      blocks.push(
        createDescriptionBlock("heading", {
          level: headingMatch[1].length,
          text: headingMatch[2].trim(),
        })
      );
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      flushQuote();
      if (listType && listType !== "bullet_list") {
        flushList();
      }
      listType = "bullet_list";
      listItems.push(bulletMatch[1].trim());
      continue;
    }

    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      flushParagraph();
      flushQuote();
      if (listType && listType !== "numbered_list") {
        flushList();
      }
      listType = "numbered_list";
      listItems.push(numberedMatch[1].trim());
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.+)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quoteLines.push(quoteMatch[1].trim());
      continue;
    }

    flushList();
    flushQuote();
    paragraphLines.push(line.trimEnd());
  }

  if (inCodeBlock) {
    flushCode();
  }

  flushAllOpenBlocks();
  return blocks;
}

async function getWorkspace() {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, owner_id")
    .eq("id", WORKSPACE_ID)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Workspace ${WORKSPACE_ID} was not found`);
  }

  return data;
}

async function getActorProfile() {
  if (!ACTOR_USER_ID) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email, role")
    .eq("id", ACTOR_USER_ID)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      `LAYERS_MCP_ACTOR_USER_ID points to a profile that does not exist: ${ACTOR_USER_ID}`
    );
  }

  return data;
}

async function userBelongsToWorkspace(userId) {
  const workspace = await getWorkspace();
  if (workspace.owner_id === userId) {
    return true;
  }

  const { data } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", WORKSPACE_ID)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data);
}

async function ensureActorCanAccessWorkspace() {
  if (!ACTOR_USER_ID) {
    return;
  }

  const canAccess = await userBelongsToWorkspace(ACTOR_USER_ID);
  if (!canAccess) {
    throw new Error(
      `Actor ${ACTOR_USER_ID} is not a member of workspace ${WORKSPACE_ID}. Set a valid LAYERS_MCP_ACTOR_USER_ID.`
    );
  }
}

async function logActivity({
  type,
  action,
  details,
  projectId = null,
  taskId = null,
  metadata = {},
}) {
  if (!ACTOR_USER_ID) {
    return;
  }

  const actor = await getActorProfile();

  const { error } = await supabase.from("activities").insert({
    workspace_id: WORKSPACE_ID,
    user_id: ACTOR_USER_ID,
    type,
    action,
    details: details ?? null,
    project_id: projectId,
    task_id: taskId,
    metadata: {
      ...metadata,
      user_display_name: actor?.display_name || actor?.email || "MCP",
      source: "mcp",
    },
  });

  if (error) {
    console.error("[layers-tasks-mcp] Failed to log activity:", error);
  }
}

async function resolveProjectId(identifier, { allowNull = false } = {}) {
  if (identifier === undefined) {
    return undefined;
  }

  if (identifier === null || identifier === "") {
    if (allowNull) {
      return null;
    }

    throw new Error("Project identifier cannot be empty");
  }

  if (isUuid(identifier)) {
    const { data, error } = await supabase
      .from("projects")
      .select("id")
      .eq("workspace_id", WORKSPACE_ID)
      .eq("id", identifier)
      .maybeSingle();

    if (error || !data) {
      throw new Error(`Project ${identifier} was not found in the configured workspace`);
    }

    return data.id;
  }

  const exactCode = await supabase
    .from("projects")
    .select("id, name, code")
    .eq("workspace_id", WORKSPACE_ID)
    .ilike("code", identifier)
    .limit(2);

  if ((exactCode.data || []).length === 1) {
    return exactCode.data[0].id;
  }

  const exactName = await supabase
    .from("projects")
    .select("id, name, code")
    .eq("workspace_id", WORKSPACE_ID)
    .ilike("name", identifier)
    .limit(2);

  if ((exactName.data || []).length === 1) {
    return exactName.data[0].id;
  }

  const fuzzy = await supabase
    .from("projects")
    .select("id, name, code")
    .eq("workspace_id", WORKSPACE_ID)
    .or(`name.ilike.%${escapeLike(identifier)}%,code.ilike.%${escapeLike(identifier)}%`)
    .limit(10);

  if (fuzzy.error) {
    throw new Error(fuzzy.error.message);
  }

  if (!fuzzy.data || fuzzy.data.length === 0) {
    throw new Error(`No project matched "${identifier}"`);
  }

  if (fuzzy.data.length > 1) {
    throw new Error(
      `Project identifier "${identifier}" is ambiguous. Matches: ${fuzzy.data
        .map((project) => `${project.name}${project.code ? ` (${project.code})` : ""}`)
        .join(", ")}`
    );
  }

  return fuzzy.data[0].id;
}

async function resolveTaskRecord(identifier) {
  if (!identifier) {
    throw new Error("Task identifier is required");
  }

  if (isUuid(identifier)) {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("workspace_id", WORKSPACE_ID)
      .eq("id", identifier)
      .maybeSingle();

    if (error || !data) {
      throw new Error(`Task ${identifier} was not found in the configured workspace`);
    }

    return data;
  }

  const exact = await supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", WORKSPACE_ID)
    .ilike("title", identifier)
    .limit(2);

  if ((exact.data || []).length === 1) {
    return exact.data[0];
  }

  const fuzzy = await supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", WORKSPACE_ID)
    .ilike("title", `%${escapeLike(identifier)}%`)
    .limit(10);

  if (fuzzy.error) {
    throw new Error(fuzzy.error.message);
  }

  if (!fuzzy.data || fuzzy.data.length === 0) {
    throw new Error(`No task matched "${identifier}"`);
  }

  if (fuzzy.data.length > 1) {
    throw new Error(
      `Task identifier "${identifier}" is ambiguous. Matches: ${fuzzy.data
        .map((task) => `${task.title} [${task.id}]`)
        .join(", ")}`
    );
  }

  return fuzzy.data[0];
}

async function resolveUserId(identifier) {
  if (!identifier) {
    throw new Error("User identifier is required");
  }

  if (isUuid(identifier)) {
    const canAccess = await userBelongsToWorkspace(identifier);
    if (!canAccess) {
      throw new Error(`User ${identifier} is not a member of workspace ${WORKSPACE_ID}`);
    }

    return identifier;
  }

  const profiles = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .or(`email.ilike.%${escapeLike(identifier)}%,display_name.ilike.%${escapeLike(identifier)}%`)
    .limit(10);

  if (profiles.error) {
    throw new Error(profiles.error.message);
  }

  const candidates = [];
  for (const profile of profiles.data || []) {
    if (await userBelongsToWorkspace(profile.id)) {
      candidates.push(profile);
    }
  }

  if (candidates.length === 0) {
    throw new Error(`No workspace member matched "${identifier}"`);
  }

  if (candidates.length > 1) {
    throw new Error(
      `User identifier "${identifier}" is ambiguous. Matches: ${candidates
        .map((profile) => profile.display_name || profile.email || profile.id)
        .join(", ")}`
    );
  }

  return candidates[0].id;
}

async function getProjectHourlyRateCents(projectId) {
  if (!projectId) {
    return null;
  }

  const { data, error } = await supabase
    .from("projects")
    .select("hourly_rate_cents")
    .eq("workspace_id", WORKSPACE_ID)
    .eq("id", projectId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.hourly_rate_cents ?? null;
}

async function getActorDefaultHourlyRateCents() {
  if (!ACTOR_USER_ID) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("default_hourly_rate")
    .eq("user_id", ACTOR_USER_ID)
    .maybeSingle();

  if (error || !data?.default_hourly_rate) {
    return null;
  }

  return Math.round(Number(data.default_hourly_rate) * 100);
}

async function resolveHourlyRateCents({ projectId, hourlyRateCents, currentTaskHourlyRateCents }) {
  if (hourlyRateCents !== undefined) {
    return hourlyRateCents;
  }

  if (currentTaskHourlyRateCents !== undefined && currentTaskHourlyRateCents !== null) {
    return currentTaskHourlyRateCents;
  }

  const projectHourlyRateCents = await getProjectHourlyRateCents(projectId);
  if (projectHourlyRateCents) {
    return projectHourlyRateCents;
  }

  if (!projectId) {
    return getActorDefaultHourlyRateCents();
  }

  return null;
}

async function calculateTaskDerivedBudgetFields({
  projectId,
  estimatedHours,
  budgetCents,
  hourlyRateCents,
  currentTaskHourlyRateCents,
}) {
  const resolvedHourlyRateCents = await resolveHourlyRateCents({
    projectId,
    hourlyRateCents,
    currentTaskHourlyRateCents,
  });

  let nextEstimatedHours = estimatedHours;
  let nextBudgetCents = budgetCents;

  if (
    nextBudgetCents !== undefined &&
    nextBudgetCents !== null &&
    nextBudgetCents > 0 &&
    (nextEstimatedHours === undefined || nextEstimatedHours === null) &&
    resolvedHourlyRateCents &&
    resolvedHourlyRateCents > 0
  ) {
    nextEstimatedHours = Number((nextBudgetCents / resolvedHourlyRateCents).toFixed(2));
  }

  if (
    nextEstimatedHours !== undefined &&
    nextEstimatedHours !== null &&
    nextEstimatedHours > 0 &&
    nextBudgetCents === undefined &&
    resolvedHourlyRateCents &&
    resolvedHourlyRateCents > 0
  ) {
    nextBudgetCents = Math.round(nextEstimatedHours * resolvedHourlyRateCents);
  }

  return {
    hourlyRateCents: resolvedHourlyRateCents,
    estimatedHours: nextEstimatedHours,
    budgetCents: nextBudgetCents,
    budgetAmount:
      nextBudgetCents === undefined
        ? undefined
        : nextBudgetCents === null
          ? null
          : nextBudgetCents / 100,
  };
}

async function getNextTaskOrderIndex(projectId, parentTaskId) {
  let query = supabase
    .from("tasks")
    .select("order_index")
    .eq("workspace_id", WORKSPACE_ID)
    .is("parent_task_id", parentTaskId ?? null);

  if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.is("project_id", null);
  }

  const { data, error } = await query
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return 0;
  }

  return (data.order_index ?? 0) + 1;
}

async function recalculateTimeEntriesForTask(task, previousTask) {
  const budgetChanged = task.budget_cents !== previousTask.budget_cents;
  const estimatedHoursChanged = task.estimated_hours !== previousTask.estimated_hours;
  const hourlyRateChanged = task.hourly_rate_cents !== previousTask.hourly_rate_cents;

  if (!budgetChanged && !estimatedHoursChanged && !hourlyRateChanged) {
    return;
  }

  const { data: timeEntries, error } = await supabase
    .from("time_entries")
    .select("id, hours, hourly_rate, user_id, date")
    .eq("task_id", task.id)
    .order("date", { ascending: true });

  if (error || !timeEntries || timeEntries.length === 0) {
    return;
  }

  let hourlyRate = 0;
  if (task.hourly_rate_cents && task.hourly_rate_cents > 0) {
    hourlyRate = task.hourly_rate_cents / 100;
  } else if (timeEntries[0]?.hourly_rate) {
    hourlyRate = timeEntries[0].hourly_rate;
  } else if (task.project_id) {
    const projectRateCents = await getProjectHourlyRateCents(task.project_id);
    if (projectRateCents) {
      hourlyRate = projectRateCents / 100;
    }
  } else {
    const actorRateCents = await getActorDefaultHourlyRateCents();
    if (actorRateCents) {
      hourlyRate = actorRateCents / 100;
    }
  }

  let budgetHoursLimit = 0;
  if (task.budget_cents && task.budget_cents > 0 && hourlyRate > 0) {
    budgetHoursLimit = task.budget_cents / 100 / hourlyRate;
  } else if (task.estimated_hours && task.estimated_hours > 0) {
    budgetHoursLimit = task.estimated_hours;
  }

  let cumulativeHours = 0;

  for (const entry of timeEntries) {
    const entryRate =
      hourlyRateChanged && hourlyRate > 0 ? hourlyRate : entry.hourly_rate || hourlyRate;
    const hoursWithinBudget = Math.max(0, Math.min(cumulativeHours, budgetHoursLimit));
    const remainingBudgetHours = Math.max(0, budgetHoursLimit - hoursWithinBudget);
    const newHoursWithinBudget = Math.min(entry.hours, remainingBudgetHours);
    const hoursOverBudget = Math.max(0, entry.hours - newHoursWithinBudget);
    const amount = hoursOverBudget * entryRate;

    const updateData = { amount };
    if (hourlyRateChanged && hourlyRate > 0) {
      updateData.hourly_rate = entryRate;
    }

    const { error: updateError } = await supabase
      .from("time_entries")
      .update(updateData)
      .eq("id", entry.id);

    if (updateError) {
      console.error("[layers-tasks-mcp] Failed to recalculate time entry:", updateError);
    }

    cumulativeHours += entry.hours;
  }
}

async function replaceTaskAssignees(taskId, desiredUserIds) {
  const uniqueIds = Array.from(new Set(desiredUserIds));
  const { data: existing, error } = await supabase
    .from("task_assignees")
    .select("user_id")
    .eq("task_id", taskId)
    .eq("workspace_id", WORKSPACE_ID);

  if (error) {
    throw new Error(error.message);
  }

  const existingIds = new Set((existing || []).map((item) => item.user_id));
  const toAdd = uniqueIds.filter((userId) => !existingIds.has(userId));
  const toRemove = Array.from(existingIds).filter((userId) => !uniqueIds.includes(userId));

  if (toAdd.length > 0) {
    const { error: insertError } = await supabase.from("task_assignees").insert(
      toAdd.map((userId) => ({
        task_id: taskId,
        user_id: userId,
        workspace_id: WORKSPACE_ID,
        assigned_by: ACTOR_USER_ID,
      }))
    );

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", taskId)
      .eq("workspace_id", WORKSPACE_ID)
      .in("user_id", toRemove);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }
}

async function assertChecklistItemInWorkspace(itemId) {
  const { data, error } = await supabase
    .from("task_checklist_items")
    .select("id, task_id, text, completed, position, created_at, updated_at")
    .eq("id", itemId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message || `Checklist item ${itemId} was not found`);
  }

  await resolveTaskRecord(data.task_id);
  return data;
}

export function registerLayersTaskTools(server) {
  server.registerTool(
    "format_task_description",
    {
      description:
        "Convert structured plain text or Markdown-like content into rich HTML for a task description. Useful when the chat model already rewrote the text and just needs it stored nicely.",
      inputSchema: {
        task: z
          .string()
          .optional()
          .describe(
            "Task id or title. Required when apply_to_task is true or raw_text is omitted."
          ),
        raw_text: z
          .string()
          .optional()
          .describe(
            "Structured content to convert. Supports headings (#, ##, ###), bullet lists, numbered lists, quotes (>), and ``` code blocks."
          ),
        apply_to_task: z
          .boolean()
          .optional()
          .describe("When true, save the formatted HTML into the selected task description."),
      },
    },
    tool(async ({ task, raw_text: rawText, apply_to_task: applyToTask }) => {
      const taskRecord = task ? await resolveTaskRecord(task) : null;

      if (applyToTask && !taskRecord) {
        throw new Error("Parameter task je povinný, keď apply_to_task=true.");
      }

      const sourceText = normalizeDescriptionSource(rawText ?? taskRecord?.description ?? "");
      if (!sourceText) {
        throw new Error(
          "Nie je čo formátovať. Pošli raw_text alebo vyber task, ktorý už má vyplnený popis."
        );
      }

      const blocks = parseStructuredDescription(sourceText);
      if (blocks.length === 0) {
        throw new Error("Nepodarilo sa rozpoznať žiadny obsah na formátovanie.");
      }

      const html = renderDescriptionBlocksToHtml(blocks);
      if (!html) {
        throw new Error("Nepodarilo sa vygenerovať HTML pre task popis.");
      }

      if (applyToTask && taskRecord) {
        const { data: updatedTask, error } = await supabase
          .from("tasks")
          .update({ description: html })
          .eq("id", taskRecord.id)
          .eq("workspace_id", WORKSPACE_ID)
          .select("*")
          .single();

        if (error || !updatedTask) {
          throw new Error(error?.message || "Task description could not be updated");
        }

        await logActivity({
          type: "task_description_changed",
          action: "Naformátoval popis úlohy cez MCP",
          details: updatedTask.title,
          projectId: updatedTask.project_id,
          taskId: updatedTask.id,
          metadata: {
            source: "mcp_description_formatter",
          },
        });

        return createJsonResult("Task description formatted and saved", {
          task_id: updatedTask.id,
          title: updatedTask.title,
          html,
          blocks,
        });
      }

      return createJsonResult("Formatted task description", {
        task_id: taskRecord?.id ?? null,
        title: taskRecord?.title ?? null,
        html,
        blocks,
      });
    })
  );

  server.registerTool(
    "list_projects",
    {
      description:
        "List projects in the configured workspace. Use this before creating or moving tasks if you need a project id.",
      inputSchema: {
        status: z.string().optional().describe("Optional project status filter"),
        query: z
          .string()
          .optional()
          .describe("Optional partial match against project name or code"),
        limit: z.number().int().min(1).max(MAX_LIST_LIMIT).optional(),
      },
    },
    tool(async ({ status, query, limit }) => {
      let builder = supabase
        .from("projects")
        .select("id, name, code, status, hourly_rate_cents, budget_cents, client_id")
        .eq("workspace_id", WORKSPACE_ID)
        .order("created_at", { ascending: false })
        .limit(clampLimit(limit));

      if (status) {
        builder = builder.eq("status", status);
      }

      if (query) {
        builder = builder.or(`name.ilike.%${escapeLike(query)}%,code.ilike.%${escapeLike(query)}%`);
      }

      const { data, error } = await builder;
      if (error) {
        throw new Error(error.message);
      }

      return createJsonResult("Projects", (data || []).map(formatProject));
    })
  );

  server.registerTool(
    "list_workspace_users",
    {
      description: "List workspace members that can be assigned to tasks.",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("Optional partial match against display name or email"),
        limit: z.number().int().min(1).max(MAX_LIST_LIMIT).optional(),
      },
    },
    tool(async ({ query, limit }) => {
      const workspace = await getWorkspace();
      const { data: members, error: memberError } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", WORKSPACE_ID);

      if (memberError) {
        throw new Error(memberError.message);
      }

      const userIds = Array.from(
        new Set([workspace.owner_id, ...(members || []).map((member) => member.user_id)])
      );
      let builder = supabase
        .from("profiles")
        .select("id, display_name, email, role")
        .in("id", userIds)
        .limit(clampLimit(limit));

      if (query) {
        builder = builder.or(
          `display_name.ilike.%${escapeLike(query)}%,email.ilike.%${escapeLike(query)}%`
        );
      }

      const { data, error } = await builder;
      if (error) {
        throw new Error(error.message);
      }

      return createJsonResult("Workspace users", (data || []).map(formatProfile));
    })
  );

  server.registerTool(
    "list_tasks",
    {
      description: "List tasks in the configured workspace with optional filters.",
      inputSchema: {
        query: z.string().optional().describe("Optional partial title match"),
        status: z.enum(TASK_STATUSES).optional(),
        priority: z.enum(TASK_PRIORITIES).optional(),
        project: z.string().optional().describe("Project id, code, or name"),
        include_completed: z.boolean().optional().describe("Include tasks with status done"),
        limit: z.number().int().min(1).max(MAX_LIST_LIMIT).optional(),
      },
    },
    tool(async ({ query, status, priority, project, include_completed, limit }) => {
      const projectId = await resolveProjectId(project, { allowNull: true });

      let builder = supabase
        .from("tasks")
        .select("*")
        .eq("workspace_id", WORKSPACE_ID)
        .order("updated_at", { ascending: false })
        .limit(clampLimit(limit));

      if (project !== undefined) {
        if (projectId) {
          builder = builder.eq("project_id", projectId);
        } else {
          builder = builder.is("project_id", null);
        }
      }

      if (query) {
        builder = builder.ilike("title", `%${escapeLike(query)}%`);
      }

      if (status) {
        builder = builder.eq("status", status);
      } else if (!include_completed) {
        builder = builder.neq("status", "done");
      }

      if (priority) {
        builder = builder.eq("priority", priority);
      }

      const { data, error } = await builder;
      if (error) {
        throw new Error(error.message);
      }

      return createJsonResult("Tasks", (data || []).map(formatTask));
    })
  );

  server.registerTool(
    "get_task",
    {
      description: "Get one task with assignees, comments, and checklist.",
      inputSchema: {
        task: z.string().describe("Task id or an exact/partial task title"),
      },
    },
    tool(async ({ task }) => {
      const taskRecord = await resolveTaskRecord(task);

      const [assigneesResult, commentsResult, checklistResult] = await Promise.all([
        supabase
          .from("task_assignees")
          .select("id, user_id, assigned_at, assigned_by")
          .eq("workspace_id", WORKSPACE_ID)
          .eq("task_id", taskRecord.id),
        supabase
          .from("task_comments")
          .select("id, task_id, user_id, content, created_at, updated_at")
          .eq("workspace_id", WORKSPACE_ID)
          .eq("task_id", taskRecord.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("task_checklist_items")
          .select("id, task_id, text, completed, position, created_at, updated_at")
          .eq("task_id", taskRecord.id)
          .order("position", { ascending: true }),
      ]);

      if (assigneesResult.error) {
        throw new Error(assigneesResult.error.message);
      }

      const assigneeIds = (assigneesResult.data || []).map((item) => item.user_id);
      const profilesResult =
        assigneeIds.length > 0
          ? await supabase
              .from("profiles")
              .select("id, display_name, email, role")
              .in("id", assigneeIds)
          : { data: [], error: null };

      if (profilesResult.error || commentsResult.error || checklistResult.error) {
        throw new Error(
          profilesResult.error?.message ||
            commentsResult.error?.message ||
            checklistResult.error?.message
        );
      }

      const profilesById = new Map(
        (profilesResult.data || []).map((profile) => [profile.id, profile])
      );

      return createJsonResult("Task detail", {
        ...formatTask(taskRecord),
        assignees: (assigneesResult.data || []).map((item) => ({
          ...item,
          user: profilesById.get(item.user_id)
            ? formatProfile(profilesById.get(item.user_id))
            : null,
        })),
        comments: (commentsResult.data || []).map(formatComment),
        checklist: (checklistResult.data || []).map(formatChecklistItem),
      });
    })
  );

  const taskMutationSchema = {
    title: z.string().min(1).max(500).optional(),
    description: z.string().nullable().optional(),
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .nullable()
      .optional(),
    project: z
      .string()
      .nullable()
      .optional()
      .describe("Project id, code, or name. Use null to remove project."),
    parent_task: z
      .string()
      .nullable()
      .optional()
      .describe("Parent task id or title. Use null to make the task root."),
    estimated_hours: z.number().min(0).nullable().optional(),
    hourly_rate_cents: z.number().min(0).nullable().optional(),
    hourly_rate_eur: z.number().min(0).nullable().optional(),
    budget_cents: z.number().min(0).nullable().optional(),
    budget_eur: z.number().min(0).nullable().optional(),
    start_date: z.string().nullable().optional().describe("ISO date/datetime"),
    end_date: z.string().nullable().optional().describe("ISO date/datetime"),
    due_date: z.string().nullable().optional().describe("ISO date/datetime"),
    order_index: z.number().int().nullable().optional(),
    sales_commission_enabled: z.boolean().nullable().optional(),
    sales_commission_user: z
      .string()
      .nullable()
      .optional()
      .describe("User id, email, or display name"),
    sales_commission_percent: z.number().min(0).max(100).nullable().optional(),
  };

  server.registerTool(
    "create_task",
    {
      description: "Create a task in the configured workspace.",
      inputSchema: {
        ...taskMutationSchema,
        title: z.string().min(1).max(500),
        assignees: z
          .array(z.string())
          .optional()
          .describe("List of user ids, emails, or display names"),
      },
    },
    tool(async (input) => {
      const projectId = await resolveProjectId(input.project, { allowNull: true });
      const parentTaskId =
        input.parent_task === undefined
          ? undefined
          : input.parent_task === null
            ? null
            : (await resolveTaskRecord(input.parent_task)).id;
      const salesCommissionUserId =
        input.sales_commission_user === undefined
          ? undefined
          : input.sales_commission_user === null
            ? null
            : await resolveUserId(input.sales_commission_user);
      const assigneeIds = input.assignees
        ? await Promise.all(input.assignees.map((identifier) => resolveUserId(identifier)))
        : [];

      const explicitHourlyRateCents =
        input.hourly_rate_cents !== undefined
          ? input.hourly_rate_cents
          : toCentsFromEuro(input.hourly_rate_eur);
      const explicitBudgetCents =
        input.budget_cents !== undefined ? input.budget_cents : toCentsFromEuro(input.budget_eur);

      const derivedBudget = await calculateTaskDerivedBudgetFields({
        projectId,
        estimatedHours: input.estimated_hours,
        budgetCents: explicitBudgetCents,
        hourlyRateCents: explicitHourlyRateCents,
        currentTaskHourlyRateCents: undefined,
      });

      const orderIndex =
        input.order_index === undefined || input.order_index === null
          ? await getNextTaskOrderIndex(projectId, parentTaskId ?? null)
          : input.order_index;

      const insertPayload = {
        workspace_id: WORKSPACE_ID,
        title: input.title.trim(),
        description: normalizeNullableText(input.description) ?? null,
        status: input.status ?? "todo",
        priority: input.priority ?? "medium",
        color: input.color ? input.color.toUpperCase() : null,
        project_id: projectId ?? null,
        parent_task_id: parentTaskId ?? null,
        estimated_hours: derivedBudget.estimatedHours ?? null,
        hourly_rate_cents: derivedBudget.hourlyRateCents ?? null,
        budget_cents: derivedBudget.budgetCents ?? null,
        budget_amount: derivedBudget.budgetAmount ?? null,
        start_date: toIsoOrNull(input.start_date) ?? null,
        end_date: toIsoOrNull(input.end_date) ?? null,
        due_date: toIsoOrNull(input.due_date) ?? null,
        order_index: orderIndex,
        sales_commission_enabled: input.sales_commission_enabled ?? null,
        sales_commission_user_id: salesCommissionUserId ?? null,
        sales_commission_percent: input.sales_commission_percent ?? null,
        created_by: ACTOR_USER_ID,
      };

      const { data: task, error } = await supabase
        .from("tasks")
        .insert(insertPayload)
        .select("*")
        .single();
      if (error || !task) {
        throw new Error(error?.message || "Task could not be created");
      }

      if (assigneeIds.length > 0) {
        const { error: assigneeError } = await supabase.from("task_assignees").insert(
          assigneeIds.map((userId) => ({
            task_id: task.id,
            user_id: userId,
            workspace_id: WORKSPACE_ID,
            assigned_by: ACTOR_USER_ID,
          }))
        );

        if (assigneeError) {
          throw new Error(assigneeError.message);
        }
      }

      await logActivity({
        type: "task_created",
        action: "Vytvoril úlohu cez MCP",
        details: task.title,
        projectId: task.project_id,
        taskId: task.id,
        metadata: {
          status: task.status,
          priority: task.priority,
          estimated_hours: task.estimated_hours,
          due_date: task.due_date,
        },
      });

      return createJsonResult("Task created", formatTask(task));
    })
  );

  server.registerTool(
    "update_task",
    {
      description:
        "Update task fields. You can change title, description, status, dates, project, budget, and more.",
      inputSchema: {
        task: z.string().describe("Task id or title"),
        ...taskMutationSchema,
        assignees: z
          .array(z.string())
          .optional()
          .describe("Optional full replacement list of task assignees"),
      },
    },
    tool(async (input) => {
      const currentTask = await resolveTaskRecord(input.task);
      const projectId =
        input.project === undefined
          ? currentTask.project_id
          : await resolveProjectId(input.project, { allowNull: true });
      const parentTaskId =
        input.parent_task === undefined
          ? currentTask.parent_task_id
          : input.parent_task === null
            ? null
            : (await resolveTaskRecord(input.parent_task)).id;
      const salesCommissionUserId =
        input.sales_commission_user === undefined
          ? currentTask.sales_commission_user_id
          : input.sales_commission_user === null
            ? null
            : await resolveUserId(input.sales_commission_user);
      const explicitHourlyRateCents =
        input.hourly_rate_cents !== undefined
          ? input.hourly_rate_cents
          : toCentsFromEuro(input.hourly_rate_eur);
      const explicitBudgetCents =
        input.budget_cents !== undefined ? input.budget_cents : toCentsFromEuro(input.budget_eur);

      const derivedBudget = await calculateTaskDerivedBudgetFields({
        projectId,
        estimatedHours:
          input.estimated_hours !== undefined ? input.estimated_hours : currentTask.estimated_hours,
        budgetCents: explicitBudgetCents,
        hourlyRateCents: explicitHourlyRateCents,
        currentTaskHourlyRateCents: currentTask.hourly_rate_cents,
      });

      const updatePayload = {};

      if (input.title !== undefined) updatePayload.title = input.title.trim();
      if (input.description !== undefined) {
        updatePayload.description = normalizeNullableText(input.description);
      }
      if (input.status !== undefined) updatePayload.status = input.status;
      if (input.priority !== undefined) updatePayload.priority = input.priority;
      if (input.color !== undefined)
        updatePayload.color = input.color ? input.color.toUpperCase() : null;
      if (input.project !== undefined) updatePayload.project_id = projectId;
      if (input.parent_task !== undefined) updatePayload.parent_task_id = parentTaskId;
      if (input.estimated_hours !== undefined || explicitBudgetCents !== undefined) {
        updatePayload.estimated_hours = derivedBudget.estimatedHours ?? null;
      }
      if (input.hourly_rate_cents !== undefined || input.hourly_rate_eur !== undefined) {
        updatePayload.hourly_rate_cents = derivedBudget.hourlyRateCents ?? null;
      }
      if (explicitBudgetCents !== undefined || input.estimated_hours !== undefined) {
        updatePayload.budget_cents = derivedBudget.budgetCents ?? null;
        updatePayload.budget_amount = derivedBudget.budgetAmount ?? null;
      }
      if (input.start_date !== undefined) updatePayload.start_date = toIsoOrNull(input.start_date);
      if (input.end_date !== undefined) updatePayload.end_date = toIsoOrNull(input.end_date);
      if (input.due_date !== undefined) updatePayload.due_date = toIsoOrNull(input.due_date);
      if (input.order_index !== undefined) updatePayload.order_index = input.order_index;
      if (input.sales_commission_enabled !== undefined) {
        updatePayload.sales_commission_enabled = input.sales_commission_enabled;
      }
      if (input.sales_commission_user !== undefined) {
        updatePayload.sales_commission_user_id = salesCommissionUserId;
      }
      if (input.sales_commission_percent !== undefined) {
        updatePayload.sales_commission_percent = input.sales_commission_percent;
      }

      let updatedTask = currentTask;
      if (Object.keys(updatePayload).length > 0) {
        const updateResult = await supabase
          .from("tasks")
          .update(updatePayload)
          .eq("id", currentTask.id)
          .eq("workspace_id", WORKSPACE_ID)
          .select("*")
          .single();

        if (updateResult.error || !updateResult.data) {
          throw new Error(updateResult.error?.message || "Task could not be updated");
        }

        updatedTask = updateResult.data;
        await recalculateTimeEntriesForTask(updatedTask, currentTask);
      }

      if (input.assignees) {
        const assigneeIds = await Promise.all(
          input.assignees.map((identifier) => resolveUserId(identifier))
        );
        await replaceTaskAssignees(currentTask.id, assigneeIds);
      }

      await logActivity({
        type:
          updatedTask.status === "done" && currentTask.status !== "done"
            ? "task_completed"
            : "task_updated",
        action:
          updatedTask.status === "done" && currentTask.status !== "done"
            ? "Dokončil úlohu cez MCP"
            : "Upravil úlohu cez MCP",
        details: updatedTask.title,
        projectId: updatedTask.project_id,
        taskId: updatedTask.id,
        metadata: {
          previous_status: currentTask.status,
          next_status: updatedTask.status,
        },
      });

      return createJsonResult("Task updated", formatTask(updatedTask));
    })
  );

  server.registerTool(
    "close_task",
    {
      description: "Close a task by setting its status to done or cancelled.",
      inputSchema: {
        task: z.string().describe("Task id or title"),
        status: z.enum(["done", "cancelled"]).optional(),
        comment: z.string().optional().describe("Optional closing comment"),
      },
    },
    tool(async ({ task, status, comment }) => {
      const taskRecord = await resolveTaskRecord(task);

      const { data: updatedTask, error } = await supabase
        .from("tasks")
        .update({ status: status ?? "done" })
        .eq("id", taskRecord.id)
        .eq("workspace_id", WORKSPACE_ID)
        .select("*")
        .single();

      if (error || !updatedTask) {
        throw new Error(error?.message || "Task could not be closed");
      }

      if (comment && comment.trim()) {
        if (!ACTOR_USER_ID) {
          throw new Error("LAYERS_MCP_ACTOR_USER_ID is required when adding a closing comment");
        }

        const { error: commentError } = await supabase.from("task_comments").insert({
          task_id: taskRecord.id,
          user_id: ACTOR_USER_ID,
          workspace_id: WORKSPACE_ID,
          content: comment.trim(),
        });

        if (commentError) {
          throw new Error(commentError.message);
        }
      }

      await logActivity({
        type: status === "cancelled" ? "task_updated" : "task_completed",
        action: status === "cancelled" ? "Zrušil úlohu cez MCP" : "Dokončil úlohu cez MCP",
        details: updatedTask.title,
        projectId: updatedTask.project_id,
        taskId: updatedTask.id,
        metadata: {
          previous_status: taskRecord.status,
          next_status: updatedTask.status,
        },
      });

      return createJsonResult("Task closed", formatTask(updatedTask));
    })
  );

  server.registerTool(
    "delete_task",
    {
      description: "Delete a task permanently.",
      inputSchema: {
        task: z.string().describe("Task id or title"),
      },
    },
    tool(async ({ task }) => {
      const taskRecord = await resolveTaskRecord(task);

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskRecord.id)
        .eq("workspace_id", WORKSPACE_ID);

      if (error) {
        throw new Error(error.message);
      }

      await logActivity({
        type: "task_deleted",
        action: "Vymazal úlohu cez MCP",
        details: taskRecord.title,
        projectId: taskRecord.project_id,
        taskId: taskRecord.id,
      });

      return createJsonResult("Task deleted", formatTask(taskRecord));
    })
  );

  server.registerTool(
    "set_task_assignees",
    {
      description: "Replace the assignee list for a task.",
      inputSchema: {
        task: z.string().describe("Task id or title"),
        assignees: z.array(z.string()).describe("List of user ids, emails, or display names"),
      },
    },
    tool(async ({ task, assignees }) => {
      const taskRecord = await resolveTaskRecord(task);
      const assigneeIds = await Promise.all(
        assignees.map((identifier) => resolveUserId(identifier))
      );

      await replaceTaskAssignees(taskRecord.id, assigneeIds);

      return createTextResult(
        `Assignees updated for task "${taskRecord.title}" (${taskRecord.id}). Assigned users: ${assigneeIds.join(", ")}`
      );
    })
  );

  server.registerTool(
    "list_task_comments",
    {
      description: "List comments for a task.",
      inputSchema: {
        task: z.string().describe("Task id or title"),
      },
    },
    tool(async ({ task }) => {
      const taskRecord = await resolveTaskRecord(task);

      const { data, error } = await supabase
        .from("task_comments")
        .select("id, task_id, user_id, content, created_at, updated_at")
        .eq("workspace_id", WORKSPACE_ID)
        .eq("task_id", taskRecord.id)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return createJsonResult("Task comments", (data || []).map(formatComment));
    })
  );

  server.registerTool(
    "add_task_comment",
    {
      description: "Add a comment to a task.",
      inputSchema: {
        task: z.string().describe("Task id or title"),
        content: z.string().min(1),
      },
    },
    tool(async ({ task, content }) => {
      if (!ACTOR_USER_ID) {
        throw new Error("LAYERS_MCP_ACTOR_USER_ID is required to add comments");
      }

      const taskRecord = await resolveTaskRecord(task);
      const { data, error } = await supabase
        .from("task_comments")
        .insert({
          task_id: taskRecord.id,
          workspace_id: WORKSPACE_ID,
          user_id: ACTOR_USER_ID,
          content: content.trim(),
        })
        .select("id, task_id, user_id, content, created_at, updated_at")
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Comment could not be created");
      }

      await logActivity({
        type: "comment_added",
        action: "Pridal komentár cez MCP",
        details: taskRecord.title,
        projectId: taskRecord.project_id,
        taskId: taskRecord.id,
        metadata: {
          comment_id: data.id,
        },
      });

      return createJsonResult("Comment created", formatComment(data));
    })
  );

  server.registerTool(
    "update_task_comment",
    {
      description: "Update an existing task comment.",
      inputSchema: {
        comment_id: z.string().uuid(),
        content: z.string().min(1),
      },
    },
    tool(async ({ comment_id: commentId, content }) => {
      const { data, error } = await supabase
        .from("task_comments")
        .update({ content: content.trim() })
        .eq("id", commentId)
        .eq("workspace_id", WORKSPACE_ID)
        .select("id, task_id, user_id, content, created_at, updated_at")
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Comment could not be updated");
      }

      await logActivity({
        type: "comment_updated",
        action: "Upravil komentár cez MCP",
        taskId: data.task_id,
        metadata: {
          comment_id: data.id,
        },
      });

      return createJsonResult("Comment updated", formatComment(data));
    })
  );

  server.registerTool(
    "delete_task_comment",
    {
      description: "Delete a task comment.",
      inputSchema: {
        comment_id: z.string().uuid(),
      },
    },
    tool(async ({ comment_id: commentId }) => {
      const { data, error } = await supabase
        .from("task_comments")
        .select("id, task_id, content")
        .eq("id", commentId)
        .eq("workspace_id", WORKSPACE_ID)
        .maybeSingle();

      if (error || !data) {
        throw new Error(error?.message || `Comment ${commentId} was not found`);
      }

      const { error: deleteError } = await supabase
        .from("task_comments")
        .delete()
        .eq("id", commentId)
        .eq("workspace_id", WORKSPACE_ID);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await logActivity({
        type: "comment_deleted",
        action: "Vymazal komentár cez MCP",
        taskId: data.task_id,
        metadata: {
          comment_id: data.id,
        },
      });

      return createJsonResult("Comment deleted", data);
    })
  );

  server.registerTool(
    "list_task_checklist",
    {
      description: "List checklist items for a task.",
      inputSchema: {
        task: z.string().describe("Task id or title"),
      },
    },
    tool(async ({ task }) => {
      const taskRecord = await resolveTaskRecord(task);
      const { data, error } = await supabase
        .from("task_checklist_items")
        .select("id, task_id, text, completed, position, created_at, updated_at")
        .eq("task_id", taskRecord.id)
        .order("position", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return createJsonResult("Checklist items", (data || []).map(formatChecklistItem));
    })
  );

  server.registerTool(
    "add_task_checklist_item",
    {
      description: "Add a checklist item to a task.",
      inputSchema: {
        task: z.string().describe("Task id or title"),
        text: z.string().min(1),
        position: z.number().int().min(0).optional(),
      },
    },
    tool(async ({ task, text, position }) => {
      const taskRecord = await resolveTaskRecord(task);

      let finalPosition = position;
      if (finalPosition === undefined) {
        const { data: lastItem } = await supabase
          .from("task_checklist_items")
          .select("position")
          .eq("task_id", taskRecord.id)
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle();

        finalPosition = lastItem ? (lastItem.position ?? 0) + 1 : 0;
      }

      const { data, error } = await supabase
        .from("task_checklist_items")
        .insert({
          task_id: taskRecord.id,
          text: text.trim(),
          position: finalPosition,
          completed: false,
          created_by: ACTOR_USER_ID,
        })
        .select("id, task_id, text, completed, position, created_at, updated_at")
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Checklist item could not be created");
      }

      return createJsonResult("Checklist item created", formatChecklistItem(data));
    })
  );

  server.registerTool(
    "update_task_checklist_item",
    {
      description: "Update a checklist item for a task.",
      inputSchema: {
        item_id: z.string().uuid(),
        text: z.string().min(1).optional(),
        completed: z.boolean().optional(),
        position: z.number().int().min(0).optional(),
      },
    },
    tool(async ({ item_id: itemId, text, completed, position }) => {
      await assertChecklistItemInWorkspace(itemId);

      const updatePayload = {};
      if (text !== undefined) updatePayload.text = text.trim();
      if (completed !== undefined) updatePayload.completed = completed;
      if (position !== undefined) updatePayload.position = position;

      const { data, error } = await supabase
        .from("task_checklist_items")
        .update(updatePayload)
        .eq("id", itemId)
        .select("id, task_id, text, completed, position, created_at, updated_at")
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Checklist item could not be updated");
      }

      return createJsonResult("Checklist item updated", formatChecklistItem(data));
    })
  );

  server.registerTool(
    "delete_task_checklist_item",
    {
      description: "Delete a checklist item.",
      inputSchema: {
        item_id: z.string().uuid(),
      },
    },
    tool(async ({ item_id: itemId }) => {
      const item = await assertChecklistItemInWorkspace(itemId);

      const { error: deleteError } = await supabase
        .from("task_checklist_items")
        .delete()
        .eq("id", itemId);
      if (deleteError) {
        throw new Error(deleteError.message);
      }

      return createJsonResult("Checklist item deleted", formatChecklistItem(item));
    })
  );
}

export function createLayersTaskServer() {
  const server = new McpServer({
    name: "layers-tasks",
    version: "1.0.0",
  });

  registerLayersTaskTools(server);

  return server;
}

async function main() {
  assertConfigured();
  await getWorkspace();
  await ensureActorCanAccessWorkspace();

  const server = createLayersTaskServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `[layers-tasks-mcp] Running on stdio for workspace ${WORKSPACE_ID}${ACTOR_USER_ID ? ` as ${ACTOR_USER_ID}` : ""}`
  );
}

const isDirectExecution =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectExecution) {
  main().catch((error) => {
    console.error("[layers-tasks-mcp] Fatal startup error:", error);
    process.exit(1);
  });
}
