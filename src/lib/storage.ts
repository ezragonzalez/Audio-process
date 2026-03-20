import { TranscriptionResult, MeetingSummary, CustomSummaryTypeConfig } from "./types";

const TRANSCRIPTIONS_KEY = "zoom_transcriptions";
const SUMMARIES_KEY = "zoom_summaries";
const CUSTOM_SUMMARY_TYPES_KEY = "zoom_custom_summary_types";
const STORAGE_VERSION_KEY = "zoom_storage_version";
const CURRENT_VERSION = 1;

function safeGetItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const data = localStorage.getItem(key);
    if (!data) return fallback;
    return JSON.parse(data) as T;
  } catch (e) {
    console.warn(`Failed to parse localStorage key "${key}":`, e);
    return fallback;
  }
}

function safeSetItem(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to write localStorage key "${key}" (quota exceeded?):`, e);
  }
}

function ensureStorageVersion(): void {
  if (typeof window === "undefined") return;
  const version = localStorage.getItem(STORAGE_VERSION_KEY);
  if (!version) {
    localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_VERSION));
  }
  // Future: add migration logic when CURRENT_VERSION > stored version
}

export function saveTranscription(transcription: TranscriptionResult): void {
  if (typeof window === "undefined") return;
  ensureStorageVersion();
  const existing = getTranscriptions();
  existing.unshift(transcription);
  safeSetItem(TRANSCRIPTIONS_KEY, existing);
}

export function getTranscriptions(): TranscriptionResult[] {
  ensureStorageVersion();
  return safeGetItem<TranscriptionResult[]>(TRANSCRIPTIONS_KEY, []);
}

export function getTranscription(id: string): TranscriptionResult | null {
  const transcriptions = getTranscriptions();
  return transcriptions.find((t) => t.id === id) || null;
}

export function deleteTranscription(id: string): void {
  const transcriptions = getTranscriptions().filter((t) => t.id !== id);
  safeSetItem(TRANSCRIPTIONS_KEY, transcriptions);
  // Also delete associated summaries
  const summaries = getSummaries().filter((s) => s.transcriptionId !== id);
  safeSetItem(SUMMARIES_KEY, summaries);
}

export function saveSummary(summary: MeetingSummary): void {
  if (typeof window === "undefined") return;
  const existing = getSummaries();
  existing.unshift(summary);
  safeSetItem(SUMMARIES_KEY, existing);
}

export function getSummaries(transcriptionId?: string): MeetingSummary[] {
  const summaries = safeGetItem<MeetingSummary[]>(SUMMARIES_KEY, []);
  if (transcriptionId) {
    return summaries.filter((s) => s.transcriptionId === transcriptionId);
  }
  return summaries;
}

export function updateTranscriptionSpeakerLabels(
  id: string,
  speakerLabels: Record<string, string>
): void {
  const transcriptions = getTranscriptions();
  const index = transcriptions.findIndex((t) => t.id === id);
  if (index !== -1) {
    transcriptions[index].speakerLabels = speakerLabels;
    safeSetItem(TRANSCRIPTIONS_KEY, transcriptions);
  }
}

// Custom summary types
export function getCustomSummaryTypes(): CustomSummaryTypeConfig[] {
  return safeGetItem<CustomSummaryTypeConfig[]>(CUSTOM_SUMMARY_TYPES_KEY, []);
}

export function saveCustomSummaryType(config: CustomSummaryTypeConfig): void {
  if (typeof window === "undefined") return;
  const existing = getCustomSummaryTypes();
  existing.push(config);
  safeSetItem(CUSTOM_SUMMARY_TYPES_KEY, existing);
}

export function deleteCustomSummaryType(id: string): void {
  const types = getCustomSummaryTypes().filter((t) => t.id !== id);
  safeSetItem(CUSTOM_SUMMARY_TYPES_KEY, types);
}
