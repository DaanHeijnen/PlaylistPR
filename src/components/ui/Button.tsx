import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "destructive"; full?: boolean; children: ReactNode };

export function Button({ variant = "primary", full, className = "", children, ...props }: Props) {
  return <button className={`button button-${variant} ${full ? "button-full" : ""} ${className}`} {...props}>{children}</button>;
}
