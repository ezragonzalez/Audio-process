import { TranscriptionResult, MeetingSummary } from "./types";

const TRANSCRIPTIONS_KEY = "zoom_transcriptions";
const SUMMARIES_KEY = "zoom_summaries";

export function saveTranscription(transcription: TranscriptionResult): void {
  if (typeof window === "undefined") return;
  const existing = getTranscriptions();
  existing.unshift(transcription);
  localStorage.setItem(TRANSCRIPTIONS_KEY, JSON.stringify(existing));
}

export function getTranscriptions(): TranscriptionResult[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(TRANSCRIPTIONS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getTranscription(id: string): TranscriptionResult | null {
  const transcriptions = getTranscriptions();
  return transcriptions.find((t) => t.id === id) || null;
}

export function deleteTranscription(id: string): void {
  const transcriptions = getTranscriptions().filter((t) => t.id !== id);
  localStorage.setItem(TRANSCRIPTIONS_KEY, JSON.stringify(transcriptions));
  // Also delete associated summaries
  const summaries = getSummaries().filter((s) => s.transcriptionId !== id);
  localStorage.setItem(SUMMARIES_KEY, JSON.stringify(summaries));
}

export function saveSummary(summary: MeetingSummary): void {
  if (typeof window === "undefined") return;
  const existing = getSummaries();
  existing.unshift(summary);
  localStorage.setItem(SUMMARIES_KEY, JSON.stringify(existing));
}

export function getSummaries(transcriptionId?: string): MeetingSummary[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(SUMMARIES_KEY);
  const summaries: MeetingSummary[] = data ? JSON.parse(data) : [];
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
    localStorage.setItem(TRANSCRIPTIONS_KEY, JSON.stringify(transcriptions));
  }
}
