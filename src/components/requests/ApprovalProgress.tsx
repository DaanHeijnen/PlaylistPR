export function ApprovalProgress({ approvedCount, requiredCount }: { approvedCount: number; requiredCount: number }) {
  const percent = requiredCount ? Math.round((approvedCount / requiredCount) * 100) : 0;
  const waiting = Math.max(requiredCount - approvedCount, 0);
  return <div className="stack" style={{ gap: 6 }}>
    <div className="row" style={{ justifyContent: "space-between" }}>
      <p className="muted" style={{ fontSize: 12 }}>Owner approvals {approvedCount}/{requiredCount}</p>
      <p className="muted" style={{ fontSize: 12 }}>{waiting === 0 ? "Approved by all" : `Waiting for ${waiting}`}</p>
    </div>
    <div className="progress"><span style={{ width: `${percent}%` }} /></div>
  </div>;
}
