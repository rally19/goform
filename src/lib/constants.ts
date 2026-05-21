export const WORKSPACE_COOKIE = "goform_workspace";
export const PERSONAL_WORKSPACE_ID = "personal";

// ─── Individual Plans Config ──────────────────────────────────────────────────
export const INDIVIDUAL_PLANS = {
  free: {
    formLimit: 3,
    storageLimit: 100 * 1024 * 1024, // 100 MB
    submissionLimit: 100, // per form
  },
  lite: {
    formLimit: 10,
    storageLimit: 1024 * 1024 * 1024, // 1 GB
    submissionLimit: 1000, // per form
  },
  pro: {
    formLimit: 50,
    storageLimit: 10 * 1024 * 1024 * 1024, // 10 GB
    submissionLimit: 10000, // per form
  },
  max: {
    formLimit: 100000, // virtually unlimited
    storageLimit: 100 * 1024 * 1024 * 1024, // 100 GB
    submissionLimit: 1000000, // per form
  },
} as const;
