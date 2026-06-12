export type Role = "owner" | "member";
export type RequestType = "add" | "remove";
export type RequestStatus = "pending" | "partially_approved" | "approved" | "denied" | "failed";
export type ReviewDecision = "approved" | "denied";

export interface AppUser {
  id: string;
  spotify_user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  spotify_playlist_id: string | null;
  spotify_playlist_name: string | null;
  spotify_playlist_image_url: string | null;
  spotify_playlist_owner_id: string | null;
  spotify_playlist_snapshot_id: string | null;
  created_by_user_id: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: Role;
  display_name: string;
  avatar_url: string | null;
}

export interface PlaylistRequest {
  id: string;
  workspace_id: string;
  type: RequestType;
  status: RequestStatus;
  spotify_track_id: string;
  track_uri: string;
  track_name: string;
  artist_name: string;
  album_name: string | null;
  album_artwork_url: string | null;
  requested_by_user_id: string;
  requester_name: string;
  requester_avatar_url: string | null;
  request_reason: string | null;
  created_at: string;
  resolved_at: string | null;
  spotify_snapshot_id: string | null;
  spotify_error: string | null;
  required_count: number;
  approved_count: number;
  denied_by_name: string | null;
  denial_reason: string | null;
  current_user_decision?: ReviewDecision | null;
}

export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artistName: string;
  albumName: string;
  artworkUrl: string | null;
  durationMs: number;
}
