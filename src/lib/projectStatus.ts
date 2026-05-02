export type NormalizedProjectStatus = "pending" | "ongoing" | "complete";

const pendingStatuses = new Set(["pending", "draft", "new", "not_started"]);
const ongoingStatuses = new Set(["ongoing", "in_progress", "active"]);
const completeStatuses = new Set(["complete", "completed", "done"]);

export const normalizeProjectStatus = (status?: string | null): NormalizedProjectStatus => {
  const value = (status || "pending").toLowerCase();

  if (completeStatuses.has(value)) return "complete";
  if (ongoingStatuses.has(value)) return "ongoing";
  if (pendingStatuses.has(value)) return "pending";

  return "pending";
};

export const getProjectStatusLabel = (status?: string | null) => {
  switch (normalizeProjectStatus(status)) {
    case "ongoing":
      return "Ongoing";
    case "complete":
      return "Completed";
    default:
      return "New";
  }
};
