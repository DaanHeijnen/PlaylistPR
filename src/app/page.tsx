import Link from "next/link";
import { getCurrentUser, getActiveWorkspace } from "@/lib/session";
import { sql } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    return <div className="page">
      {params.error ? <div className="error">{params.error}</div> : null}
      <section className="card" style={{ display: "grid", gap: 18, textAlign: "center", padding: 28 }}>
        <div className="brand-mark" style={{ justifySelf: "center", width: 64, height: 64, borderRadius: 20 }}>PR</div>
        <div className="stack">
          <p className="eyebrow">Mobile-first Spotify approvals</p>
          <h1>Playlist PR</h1>
          <p>Request songs, review changes with every owner, and keep a transparent playlist history.</p>
        </div>
        <Link href="/api/auth/spotify"><Button full>Continue with Spotify</Button></Link>
      </section>
    </div>;
  }
  const workspace = await getActiveWorkspace(user.id);
  const stats = workspace ? await sql<{ pending: number; approved: number; denied: number }[]>`
    SELECT
      count(*) FILTER (WHERE status IN ('pending','partially_approved'))::int AS pending,
      count(*) FILTER (WHERE status = 'approved')::int AS approved,
      count(*) FILTER (WHERE status = 'denied')::int AS denied
    FROM playlist_requests WHERE workspace_id = ${workspace.id}
  ` : [{ pending: 0, approved: 0, denied: 0 }];
  const recent = workspace ? await sql`
    SELECT pr.*, u.display_name AS requester_name
    FROM playlist_requests pr JOIN users u ON u.id = pr.requested_by_user_id
    WHERE pr.workspace_id = ${workspace.id}
    ORDER BY pr.created_at DESC LIMIT 5
  ` : [];
  return <div className="page">
    <div className="page-header">
      <div><p className="eyebrow">Welcome back</p><h1>{user.display_name}</h1></div>
      <Link href="/request-song"><Button>Request song</Button></Link>
    </div>
    {!workspace?.spotify_playlist_id ? <EmptyState title="No playlist selected" description="Open settings to select the Spotify playlist this workspace manages." icon="library_music" /> : <Card>
      <div className="row">
        {workspace.spotify_playlist_image_url ? <img src={workspace.spotify_playlist_image_url} className="hero-art" alt="" /> : <div className="hero-art" />}
        <div className="stack" style={{ gap: 8 }}>
          <p className="eyebrow">Active playlist</p>
          <h1>{workspace.spotify_playlist_name}</h1>
          <p>{stats[0].pending} open requests</p>
        </div>
      </div>
    </Card>}
    <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
      <Card><p className="eyebrow">Open</p><h1>{stats[0].pending}</h1></Card>
      <Card><p className="eyebrow">Approved</p><h1>{stats[0].approved}</h1></Card>
      <Card><p className="eyebrow">Denied</p><h1>{stats[0].denied}</h1></Card>
    </div>
    <section className="stack">
      <h2>Recent activity</h2>
      {recent.length === 0 ? <EmptyState title="No activity yet" description="Requests will appear here once members submit them." icon="history" /> : recent.map((item: any) => <Link key={item.id} href={`/requests/${item.id}`} className="card card-link row">
        {item.album_artwork_url ? <img src={item.album_artwork_url} className="art" alt="" /> : <div className="art" />}
        <div style={{ minWidth: 0, flex: 1 }}><h2 className="truncate">{item.track_name}</h2><p>{item.type === "add" ? "Add" : "Remove"} by {item.requester_name}</p></div>
        <StatusBadge status={item.status} />
      </Link>)}
    </section>
  </div>;
}
