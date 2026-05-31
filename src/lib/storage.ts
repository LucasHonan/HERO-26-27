import { seedData } from "../data/seedData";
import { AppData, SavedSnapshot } from "../types";
import { isAppData, validateAppData } from "./validation";

const STORAGE_KEY = "hero-rover-tracker:v2";
const LEGACY_STORAGE_KEY = "hero-rover-tracker";
export const SCHEMA_VERSION = 2;

const stamp = () => new Date().toISOString();

const withSchema = (data: AppData): AppData => ({
  ...seedData,
  ...data,
  schemaVersion: SCHEMA_VERSION,
  snapshots: data.snapshots ?? [],
});

const migrateLegacy = (legacy: unknown): AppData | null => {
  if (!legacy || typeof legacy !== "object") return null;
  const record = legacy as Record<string, unknown>;
  return withSchema({
    ...seedData,
    research: Array.isArray(record.research) ? (record.research as AppData["research"]) : seedData.research,
    decisions: Array.isArray(record.decisions) ? (record.decisions as AppData["decisions"]) : seedData.decisions,
    requirements: Array.isArray(record.requirements) ? (record.requirements as AppData["requirements"]) : seedData.requirements,
    tests: Array.isArray(record.tests) ? (record.tests as AppData["tests"]) : seedData.tests,
    risks: Array.isArray(record.risks) ? (record.risks as AppData["risks"]) : seedData.risks,
    matrices: Array.isArray(record.matrices)
      ? (record.matrices as AppData["matrices"])
      : Array.isArray(record.matrix)
        ? seedData.matrices
        : seedData.matrices,
    snapshots: [],
  });
};

export const loadAppData = (): AppData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isAppData(parsed)) return withSchema(parsed);
    }

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const migrated = migrateLegacy(JSON.parse(legacyRaw) as unknown);
      if (migrated) {
        saveAppData(migrated);
        return migrated;
      }
    }
  } catch {
    return seedData;
  }

  return seedData;
};

export const saveAppData = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(withSchema(data)));
};

export const createSnapshot = (data: AppData): AppData => {
  const snapshot: SavedSnapshot = {
    id: `snapshot-${Date.now()}`,
    label: `Snapshot ${new Date().toLocaleString()}`,
    createdAt: stamp(),
    data: {
      schemaVersion: SCHEMA_VERSION,
      research: data.research,
      decisions: data.decisions,
      requirements: data.requirements,
      tests: data.tests,
      risks: data.risks,
      matrices: data.matrices,
    },
  };
  return { ...data, snapshots: [snapshot, ...data.snapshots].slice(0, 10) };
};

export const exportBackupJson = (data: AppData) => JSON.stringify(withSchema(data), null, 2);

export const importBackupJson = (text: string): { data?: AppData; error?: string } => {
  try {
    const parsed = JSON.parse(text) as unknown;
    const result = validateAppData(parsed);
    if (!result.valid) return { error: result.errors.join(" ") };
    return { data: withSchema(parsed as AppData) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid JSON backup." };
  }
};

export const downloadTextFile = (filename: string, content: string, type = "text/plain") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
