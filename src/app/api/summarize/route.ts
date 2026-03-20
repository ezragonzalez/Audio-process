import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// GPT-4o-mini pricing: $0.15 per 1M input tokens, $0.60 per 1M output tokens
const INPUT_COST_PER_TOKEN = 0.00000015;
const OUTPUT_COST_PER_TOKEN = 0.0000006;

export async function POST(req: NextRequest) {
  try {
    // Auth check (defense-in-depth, middleware also checks)
    const session = req.cookies.get("session")?.value;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const { transcript, prompt, speakerLabels } = await req.json();

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional meeting analyst. You provide clear, well-structured summaries and analysis of meeting transcriptions. Use markdown formatting for readability. Be thorough but concise.",
        },
        {
          role: "user",
          content: `${prompt}\n\n---\n\nMEETING TRANSCRIPTION:\n\n${labeledTranscript}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content || "";
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const cost =
      inputTokens * INPUT_COST_PER_TOKEN +
      outputTokens * OUTPUT_COST_PER_TOKEN;

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
