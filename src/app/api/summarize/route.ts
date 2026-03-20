import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from "assemblyai";

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || "",
});

// AssemblyAI LeMUR pricing with Claude Sonnet 4.6: $3.00 per 1M input tokens, ~$15 per 1M output tokens
// Using conservative estimate for cost display
const INPUT_COST_PER_TOKEN = 0.000003;
const OUTPUT_COST_PER_TOKEN = 0.000015;

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

    const { transcript, prompt, speakerLabels, transcriptId } = await req.json();

    if (typeof transcript !== "string" || transcript.length === 0) {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 }
      );
    }

    if (typeof prompt !== "string" || prompt.length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (transcript.length > 500_000) {
      return NextResponse.json(
        { error: "Transcript too long (max 500K characters)" },
        { status: 400 }
      );
    }

    // Build the transcript with speaker labels
    let labeledTranscript = transcript;
    if (speakerLabels) {
      for (const [original, label] of Object.entries(speakerLabels)) {
        if (label && label !== original) {
          labeledTranscript = labeledTranscript.replaceAll(
            original,
            label as string
          );
        }
      }
    }

    // Use LeMUR task with Claude Sonnet 4.6 for best quality summaries
    const lemurParams: {
      prompt: string;
      final_model: string;
      temperature: number;
      max_output_size: number;
      transcript_ids?: string[];
      input_text?: string;
    } = {
      prompt: `${prompt}\n\nYou are a professional meeting analyst. Provide clear, well-structured analysis using markdown formatting. Be thorough but concise.`,
      final_model: "anthropic/claude-sonnet-4-20250514",
      temperature: 0.3,
      max_output_size: 4000,
    };

    // If we have a transcript ID from AssemblyAI, reference it directly
    // Otherwise fall back to passing the text directly
    if (transcriptId) {
      lemurParams.transcript_ids = [transcriptId];
      // Also pass labeled transcript as context if labels were changed
      if (labeledTranscript !== transcript) {
        lemurParams.input_text = labeledTranscript;
      }
    } else {
      lemurParams.input_text = labeledTranscript;
    }

    const response = await client.lemur.task(lemurParams);

    const content = response.response || "";

    // Estimate token usage for cost display
    // Rough estimate: 1 token ≈ 4 characters
    const estimatedInputTokens = Math.ceil(labeledTranscript.length / 4) + Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = Math.ceil(content.length / 4);
    const cost =
      estimatedInputTokens * INPUT_COST_PER_TOKEN +
      estimatedOutputTokens * OUTPUT_COST_PER_TOKEN;

    return NextResponse.json({
      content,
      cost: Math.round(cost * 10000) / 10000,
    });
  } catch (error) {
    console.error("Summarization error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary. Please try again." },
      { status: 500 }
    );
  }
}
