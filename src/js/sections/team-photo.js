export const TEAM_PLACEHOLDER_PATH = "assets/images/team-placeholder.svg";
// The content builder also imports the renderer registry outside Vite.
export const TEAM_PLACEHOLDER_URL = `${import.meta.env?.BASE_URL ?? "/"}${TEAM_PLACEHOLDER_PATH}`;

export function isCustomTeamPhoto(value) {
  return typeof value === "string" && !!value.trim() &&
    value.replace(/^\//, "") !== TEAM_PLACEHOLDER_PATH;
}

export function resolveTeamPhoto(value) {
  // Preserve legacy references; only absent photos use the new shared asset.
  return typeof value === "string" && value.trim() ? value : TEAM_PLACEHOLDER_URL;
}
