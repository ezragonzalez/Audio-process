import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from "assemblyai";

export const maxDuration = 30;

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || "",
});

// AssemblyAI Universal-3 Pro pricing: $0.21/hour
const COST_PER_SECOND = 0.21 / 3600;

export async function GET(req: NextRequest) {
  try {
    const session = req.cookies.get("session")?.value;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.ASSEMBLYAI_API_KEY) {
      return NextResponse.json(
        { error: "AssemblyAI API key not configured" },
        { status: 500 }
      );
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Transcript ID is required" },
        { status: 400 }
      );
    }

    const transcript = await client.transcripts.get(id);

    if (transcript.status === "queued" || transcript.status === "processing") {
      return NextResponse.json({ status: "processing" });
    }

    if (transcript.status === "error") {
      return NextResponse.json(
        { status: "error", error: transcript.error || "Transcription failed" },
        { status: 500 }
      );
    }

    // Completed — process and return full results
    const durationSeconds = transcript.audio_duration || 0;
    const transcriptionCost = durationSeconds * COST_PER_SECOND;

    const utterances = (transcript.utterances || []).map((u) => ({
      speaker: `Speaker ${u.speaker}`,
      text: u.text,
      start: u.start,
      end: u.end,
      confidence: u.confidence,
    }));

    const speakers = new Set(utterances.map((u) => u.speaker));

    // Use speaker identification mapping if available (auto-detected names)
    const idMapping = (
      transcript as Record<string, unknown>
    ).speech_understanding as
      | { response?: { speaker_identification?: { mapping?: Record<string, string> } } }
      | undefined;
    const nameMapping = idMapping?.response?.speaker_identification?.mapping;

    const speakerLabels: Record<string, string> = {};
    speakers.forEach((s) => {
      const letter = s.replace("Speaker ", "");
      if (nameMapping && nameMapping[letter]) {
        speakerLabels[s] = nameMapping[letter];
      } else {
        speakerLabels[s] = s;
      }
    });

    return NextResponse.json({
      status: "completed",
      transcriptId: transcript.id,
      utterances,
      fullText: transcript.text || "",
      duration: durationSeconds * 1000,
      speakerCount: speakers.size,
      speakerLabels,
      cost: {
        transcription: Math.round(transcriptionCost * 10000) / 10000,
        summary: 0,
        total: Math.round(transcriptionCost * 10000) / 10000,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to check transcription status";
    console.error("Transcription status error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
