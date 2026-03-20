import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// GPT-5.4 Mini pricing: $0.75/1M input, $4.50/1M output (thinking tokens billed as output)
const INPUT_COST_PER_TOKEN = 0.75 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 4.5 / 1_000_000;

export async function POST(req: NextRequest) {
  try {
    const session = req.cookies.get("session")?.value;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      !process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY === "your_openai_api_key_here"
    ) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Add OPENAI_API_KEY to your environment variables." },
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

    const systemPrompt =
      "You are a professional meeting analyst. Provide clear, well-structured analysis using markdown formatting. Be thorough but concise.";

    const userMessage = `${prompt}\n\n--- TRANSCRIPT ---\n${labeledTranscript}`;

    const response = await openai.responses.create({
      model: "gpt-5.4-mini",
      instructions: systemPrompt,
      input: userMessage,
      reasoning: {
        effort: "medium",
      },
      max_output_tokens: 16000,
    });

    // Extract text content from output
    let content = "";
    for (const item of response.output) {
      if (item.type === "message") {
        for (const c of item.content) {
          if (c.type === "output_text") {
            content += c.text;
          }
        }
      }
    }

    // Calculate cost from actual usage
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const cost =
      inputTokens * INPUT_COST_PER_TOKEN +
      outputTokens * OUTPUT_COST_PER_TOKEN;

    return NextResponse.json({
      content,
      cost: Math.round(cost * 10000) / 10000,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate summary";
    console.error("Summarization error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
