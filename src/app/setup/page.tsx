import { Card } from "@/components/ui/Card";

export default function SetupPage() {
  return <div className="page">
    <div><p className="eyebrow">Deployment setup</p><h1>Setup guide</h1></div>
    <Card><div className="stack">
      <h2>Database</h2>
      <p>This app uses migrations instead of a public setup page that creates tables. Run <strong>npm run db:migrate</strong> after adding your Netlify Database connection string.</p>
    </div></Card>
    <Card><div className="stack">
      <h2>Spotify redirect URLs</h2>
      <p>Local: http://localhost:3000/api/auth/spotify/callback</p>
      <p>Production: https://playlistpr.netlify.app/api/auth/spotify/callback</p>
    </div></Card>
  </div>;
}
