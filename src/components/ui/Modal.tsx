import type { ReactNode } from "react";

export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" onClick={onClose}>
    <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
      <div style={{ width: 44, height: 4, borderRadius: 999, background: "var(--color-surface-highest)", justifySelf: "center" }} />
      {children}
    </div>
  </div>;
}
