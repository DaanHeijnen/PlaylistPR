import { Button } from "./Button";

export function EmptyState({ icon = "music_note", title, description, actionLabel, onAction }: { icon?: string; title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  return <div className="card empty">
    <span className="material-symbols-outlined" style={{ color: "var(--color-primary)", fontSize: 34 }}>{icon}</span>
    <h2>{title}</h2>
    <p>{description}</p>
    {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
  </div>;
}
