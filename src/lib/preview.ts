/** Explicit sample-only deployment mode. It never enables live API access. */
export function previewModeEnabled(): boolean {
  return process.env.READ_ONLY_PREVIEW === "1";
}
