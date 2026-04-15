// Shared action catalog for /api/jobs (Next route) and worker.mjs.
// Worker imports the same definitions via ../src/lib/actions.mjs symlink? No —
// keep types here; export the plain JS map from actions.js for the worker.

export type ActionName =
  | "evaluate"
  | "scan"
  | "pdf"
  | "contacto"
  | "deep"
  | "interview-prep"
  | "apply"
  | "training"
  | "project"
  | "ofertas"
  | "batch";

export type ActionArgs = Record<string, unknown>;

type ActionSpec = {
  name: ActionName;
  requires: string[];
  validate?: (args: ActionArgs) => string | null;
  prompt: (args: ActionArgs) => string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isHttpUrl(v: unknown): v is string {
  return typeof v === "string" && /^https?:\/\//.test(v);
}

export const ACTIONS: Record<ActionName, ActionSpec> = {
  evaluate: {
    name: "evaluate",
    requires: ["url"],
    validate: (a) => (isHttpUrl(a.url) ? null : "evaluate requires valid url"),
    prompt: (a) => `/career-ops oferta ${a.url}`,
  },
  scan: {
    name: "scan",
    requires: [],
    prompt: () => `/career-ops scan`,
  },
  pdf: {
    name: "pdf",
    requires: ["company"],
    validate: (a) => (isNonEmptyString(a.company) ? null : "pdf requires company"),
    prompt: (a) => `/career-ops pdf ${a.company}`,
  },
  contacto: {
    name: "contacto",
    requires: ["company", "role"],
    validate: (a) =>
      isNonEmptyString(a.company) && isNonEmptyString(a.role)
        ? null
        : "contacto requires company and role",
    prompt: (a) => `/career-ops contacto ${a.company} — ${a.role}`,
  },
  deep: {
    name: "deep",
    requires: ["company"],
    validate: (a) => (isNonEmptyString(a.company) ? null : "deep requires company"),
    prompt: (a) => `/career-ops deep ${a.company}`,
  },
  "interview-prep": {
    name: "interview-prep",
    requires: ["company", "role"],
    validate: (a) =>
      isNonEmptyString(a.company) && isNonEmptyString(a.role)
        ? null
        : "interview-prep requires company and role",
    prompt: (a) => `/career-ops interview-prep ${a.company} — ${a.role}`,
  },
  apply: {
    name: "apply",
    requires: ["url"],
    validate: (a) => (isHttpUrl(a.url) ? null : "apply requires valid url"),
    prompt: (a) => `/career-ops apply ${a.url}`,
  },
  training: {
    name: "training",
    requires: ["url"],
    validate: (a) => (isHttpUrl(a.url) ? null : "training requires valid url"),
    prompt: (a) => `/career-ops training ${a.url}`,
  },
  project: {
    name: "project",
    requires: ["description"],
    validate: (a) =>
      isNonEmptyString(a.description) ? null : "project requires description",
    prompt: (a) => `/career-ops project ${a.description}`,
  },
  ofertas: {
    name: "ofertas",
    requires: ["reports"],
    validate: (a) => {
      if (!Array.isArray(a.reports) || a.reports.length < 2) {
        return "ofertas requires at least 2 report slugs";
      }
      if (!a.reports.every(isNonEmptyString)) return "ofertas reports must all be strings";
      return null;
    },
    prompt: (a) => `/career-ops ofertas ${(a.reports as string[]).join(" ")}`,
  },
  batch: {
    name: "batch",
    requires: [],
    prompt: () => `/career-ops batch`,
  },
};

export const ACTION_NAMES = Object.keys(ACTIONS) as ActionName[];

export function isActionName(s: string): s is ActionName {
  return (ACTION_NAMES as string[]).includes(s);
}

export function validateAction(action: string, args: ActionArgs): string | null {
  if (!isActionName(action)) return `unknown action: ${action}`;
  const spec = ACTIONS[action];
  return spec.validate ? spec.validate(args) : null;
}

export function buildPrompt(action: ActionName, args: ActionArgs): string {
  return ACTIONS[action].prompt(args);
}
