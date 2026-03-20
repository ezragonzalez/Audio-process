import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export async function POST(req: NextRequest) {
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

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const mimeType = file.type;
    if (!mimeType.startsWith("audio/") && !mimeType.startsWith("video/")) {
      return NextResponse.json(
        { error: `Invalid file type "${mimeType}". Only audio and video files are accepted.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 500MB.` },
        { status: 400 }
      );
    }

    // Stream the file directly to AssemblyAI's upload endpoint
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: file.stream(),
    });

    if (!uploadResponse.ok) {
      const text = await uploadResponse.text();
      return NextResponse.json(
        { error: `Upload failed: ${text}` },
        { status: uploadResponse.status }
      );
    }

    const { upload_url } = await uploadResponse.json();

    return NextResponse.json({ uploadUrl: upload_url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file. Please try again." },
      { status: 500 }
    );
  }
}
