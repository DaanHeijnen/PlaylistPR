import type { RequestStatus } from "@/lib/types";

const labels: Record<RequestStatus, string> = {
  pending: "Waiting",
  partially_approved: "Partially approved",
  approved: "Approved",
  denied: "Denied",
  failed: "Failed"
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`status status-${status}`}>{labels[status]}</span>;
}
