import Link from "next/link";
import type { AppUser, Workspace } from "@/lib/types";

export function TopAppBar({ user, workspace }: { user: AppUser | null; workspace: Workspace | null }) {
  return <header className="top-app-bar">
    <div className="top-app-bar__inner">
      <Link href="/" className="brand" aria-label="Playlist PR home">
        <span className="brand-mark">PR</span>
        <span>{workspace?.spotify_playlist_name || workspace?.name || "Playlist PR"}</span>
      </Link>
      <div className="row">
        <Link href="/settings" aria-label="Settings"><span className="material-symbols-outlined">settings</span></Link>
        {user?.avatar_url ? <img src={user.avatar_url} className="avatar" alt="" /> : <span className="avatar" />}
      </div>
    </div>
  </header>;
}
