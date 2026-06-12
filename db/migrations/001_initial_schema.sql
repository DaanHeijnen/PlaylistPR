CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_user_id text UNIQUE NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  spotify_playlist_id text,
  spotify_playlist_name text,
  spotify_playlist_image_url text,
  spotify_playlist_owner_id text,
  spotify_playlist_snapshot_id text,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS playlist_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('add','remove')),
  status text NOT NULL CHECK (status IN ('pending','partially_approved','approved','denied','failed')) DEFAULT 'pending',
  spotify_track_id text NOT NULL,
  track_uri text NOT NULL,
  track_name text NOT NULL,
  artist_name text NOT NULL,
  album_name text,
  album_artwork_url text,
  requested_by_user_id uuid NOT NULL REFERENCES users(id),
  request_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  spotify_snapshot_id text,
  spotify_error text
);

CREATE TABLE IF NOT EXISTS request_required_reviewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES playlist_requests(id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, reviewer_user_id)
);

CREATE TABLE IF NOT EXISTS request_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES playlist_requests(id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('approved','denied')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, reviewer_user_id)
);

CREATE TABLE IF NOT EXISTS invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_requests_workspace_status ON playlist_requests(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_reviews_request_id ON request_reviews(request_id);
