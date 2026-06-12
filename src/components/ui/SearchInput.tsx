export function SearchInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <div className="row" style={{ position: "relative" }}>
    <span className="material-symbols-outlined" style={{ position: "absolute", left: 12, color: "var(--color-outline)" }}>search</span>
    <input className="input" style={{ paddingLeft: 42 }} {...props} />
  </div>;
}
