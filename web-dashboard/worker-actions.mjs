// Plain JS mirror of src/lib/actions.ts for worker.mjs.
// Validation is authoritative at the API boundary (src/lib/actions.ts);
// worker only needs prompt assembly.

export function buildSkillPrompt(action, args = {}) {
  switch (action) {
    case "evaluate":
      if (!args.url) throw new Error("evaluate requires args.url");
      return `/career-ops oferta ${args.url}`;
    case "scan":
      return `/career-ops scan`;
    case "pdf":
      if (!args.company) throw new Error("pdf requires args.company");
      return `/career-ops pdf ${args.company}`;
    case "contacto":
      if (!args.company || !args.role) throw new Error("contacto requires company and role");
      return `/career-ops contacto ${args.company} — ${args.role}`;
    case "deep":
      if (!args.company) throw new Error("deep requires args.company");
      return `/career-ops deep ${args.company}`;
    case "interview-prep":
      if (!args.company || !args.role)
        throw new Error("interview-prep requires company and role");
      return `/career-ops interview-prep ${args.company} — ${args.role}`;
    case "apply":
      if (!args.url) throw new Error("apply requires args.url");
      return `/career-ops apply ${args.url}`;
    case "training":
      if (!args.url) throw new Error("training requires args.url");
      return `/career-ops training ${args.url}`;
    case "project":
      if (!args.description) throw new Error("project requires args.description");
      return `/career-ops project ${args.description}`;
    case "ofertas":
      if (!Array.isArray(args.reports) || args.reports.length < 2)
        throw new Error("ofertas requires at least 2 report slugs");
      return `/career-ops ofertas ${args.reports.join(" ")}`;
    case "batch":
      return `/career-ops batch`;
    default:
      throw new Error(`unknown action: ${action}`);
  }
}
