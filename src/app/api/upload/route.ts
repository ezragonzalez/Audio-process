import { NextRequest, NextResponse } from "next/server";

// Returns the AssemblyAI upload config so the client can upload directly,
// bypassing Vercel's 4.5MB body size limit entirely.
export async function GET(req: NextRequest) {
  try {
    const session = req.cookies.get("session")?.value;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AssemblyAI API key not configured" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      uploadUrl: "https://api.assemblyai.com/v2/upload",
      authToken: apiKey,
    });
  } catch (error) {
    console.error("Upload config error:", error);
    return NextResponse.json(
      { error: "Failed to get upload configuration" },
      { status: 500 }
    );
  }
}
