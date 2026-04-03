import type { Catalog, FileStatus } from "./types";

export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function identifyFile(
  hash: string,
  catalogs: Catalog[],
): { catalog: Catalog | null; status: FileStatus } {
  const match = catalogs.find((c) => c.sha256 === hash);
  if (!match) {
    return { catalog: null, status: "unknown" };
  }

  // Find the most recent release date for this faction
  const factionCatalogs = catalogs.filter((c) => c.faction === match.faction);
  const latestDate = factionCatalogs.reduce(
    (max, c) => (c.releaseDate > max ? c.releaseDate : max),
    "",
  );

  const status: FileStatus = match.releaseDate === latestDate ? "current" : "outdated";
  return { catalog: match, status };
}
