# Playlist PR

Playlist PR is a mobile-first Spotify playlist request and approval app. Members can request additions or removals. Required owners approve unanimously before Spotify is updated. A single owner denial closes the request with a required reason.

## Stack

- Next.js with TypeScript
- Netlify hosting with GitHub deploy previews
- Netlify Database or any Postgres-compatible database
- Spotify OAuth and Spotify Web API
- Server-side session cookie, valid for 5 days

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill these values:

```bash
NETLIFY_DATABASE_URL=your_postgres_connection_string
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
SESSION_COOKIE_NAME=playlist_pr_session
```

4. Run database migrations:

```bash
npm run db:migrate
```

5. Start local development:

```bash
npm run dev
```

## Spotify Developer app setup

Create a Spotify app in the Spotify Developer Dashboard.

Use these redirect URLs:

```txt
http://localhost:3000/api/auth/spotify/callback
https://playlistpr.netlify.app/api/auth/spotify/callback
```

Required scopes are configured in `src/lib/spotify.ts`:

```txt
user-read-email
playlist-read-private
playlist-read-collaborative
playlist-modify-private
playlist-modify-public
```

## Netlify setup

Connect the GitHub repo to Netlify.

Build command:

```bash
npm run build
```

Publish directory:

```bash
.next
```

Environment variables for production:

```bash
NETLIFY_DATABASE_URL=your_netlify_database_connection_string
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://playlistpr.netlify.app/api/auth/spotify/callback
NEXT_PUBLIC_APP_URL=https://playlistpr.netlify.app
SESSION_COOKIE_NAME=playlist_pr_session
```

Pull requests will create deploy previews. Merges to `main` will deploy production when Netlify is connected to GitHub.

## Database setup

There is no public `setup.html` that creates the database because that would be unsafe. Database creation is handled by SQL migrations in `db/migrations`.

Run:

```bash
npm run db:migrate
```

## MVP features included

- Spotify login
- 5 day app sessions
- Automatic first workspace and owner for the first logged in user
- Workspace playlist selection
- Playlist viewing and playlist search
- Spotify song search by title, artist, or track link
- Add song requests
- Remove song requests
- Required owner reviewers copied at request creation
- Owner approval with confirmation
- Owner denial with required reason
- Automatic Spotify update after unanimous approval
- Failed Spotify updates stored on the request
- Request detail and reviewer trail
- History filters by status and request type
- Invite links
- Member list
- Promote member to owner
- Remove member
- Mobile-first dark UI with shared design tokens

## Important files

```txt
src/app                 Next.js routes and API routes
src/components          Reusable UI, layout, playlist, and request components
src/lib                 Database, session, Spotify, and shared types
db/migrations           Database schema
src/styles              Design tokens and global CSS
```
