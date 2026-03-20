import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from "assemblyai";

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || "",
});

// AssemblyAI Universal-3 Pro pricing: $0.21/hour = $0.0000583/second
const COST_PER_SECOND = 0.21 / 3600;

export async function POST(req: NextRequest) {
  try {
    // Auth check (defense-in-depth, middleware also checks)
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

    const body = await req.json();
    const { audioUrl } = body;

    if (!audioUrl || typeof audioUrl !== "string") {
      return NextResponse.json(
        { error: "No audio URL provided" },
        { status: 400 }
      );
    }

    // Transcribe with speaker diarization using Universal-3 Pro (best model)
    const transcript = await client.transcripts.transcribe({
      audio_url: audioUrl,
      speech_model: "best",
      speaker_labels: true,
      language_detection: true,
    });

    if (transcript.status === "error") {
      return NextResponse.json(
        { error: transcript.error || "Transcription failed" },
        { status: 500 }
      );
    }

    // Calculate cost
    const durationSeconds = transcript.audio_duration || 0;
    const transcriptionCost = durationSeconds * COST_PER_SECOND;

    // Map utterances
    const utterances = (transcript.utterances || []).map((u) => ({
      speaker: `Speaker ${u.speaker}`,
      text: u.text,
      start: u.start,
      end: u.end,
      confidence: u.confidence,
    }));

    // Count unique speakers
    const speakers = new Set(utterances.map((u) => u.speaker));

    // Create default speaker labels
    const speakerLabels: Record<string, string> = {};
    speakers.forEach((s) => {
      speakerLabels[s] = s;
    });

    return NextResponse.json({
      transcriptId: transcript.id,
      utterances,
      fullText: transcript.text || "",
      duration: (transcript.audio_duration || 0) * 1000, // Convert to ms
      speakerCount: speakers.size,
      speakerLabels,
      cost: {
        transcription: Math.round(transcriptionCost * 10000) / 10000,
        summary: 0,
        total: Math.round(transcriptionCost * 10000) / 10000,
      },
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Failed to transcribe file. Please try again." },
      { status: 500 }
    );
  }
}
