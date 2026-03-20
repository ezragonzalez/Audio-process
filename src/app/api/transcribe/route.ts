import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from "assemblyai";

export const maxDuration = 30;

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || "",
});

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { audioUrl } = body;

    if (!audioUrl || typeof audioUrl !== "string") {
      return NextResponse.json(
        { error: "No audio URL provided" },
        { status: 400 }
      );
    }

    // Submit transcription (non-blocking — returns immediately with transcript ID)
    const transcript = await client.transcripts.submit({
      audio_url: audioUrl,
      speech_model: "best",
      speaker_labels: true,
      language_detection: true,
    });

    return NextResponse.json({ transcriptId: transcript.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit transcription";
    console.error("Transcription submit error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
