/**
 * Bun-only runtime shim, loaded via `preload` in bunfig.toml so it runs before
 * any import.
 *
 * The mongodb driver's bson dependency probes `v8.startupSnapshot
 * .isBuildingSnapshot()` at module scope. Bun exposes the object but throws
 * NotImplementedError on the call, so merely importing the driver takes down
 * anything that touches it — every route under /api and `next build`'s
 * page-data collection. Answer "no, not building a snapshot" when the real
 * implementation is missing.
 *
 * Node never reads bunfig.toml, and the patch only applies when the call throws,
 * so a Node-based build (Vercel) is untouched.
 */
const v8 = (process as unknown as { getBuiltinModule?: (m: string) => unknown }).getBuiltinModule?.("v8") as
  | { startupSnapshot?: { isBuildingSnapshot?: () => boolean } }
  | undefined;

if (v8?.startupSnapshot) {
  try {
    v8.startupSnapshot.isBuildingSnapshot?.();
  } catch {
    v8.startupSnapshot.isBuildingSnapshot = () => false;
  }
}
