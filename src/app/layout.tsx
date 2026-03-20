import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zoom Transcription Studio",
  description: "AI-powered meeting transcription and summarization",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen overflow-x-hidden">
        {/* Background orbs */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="bg-orb w-96 h-96 bg-purple-600 top-[-10%] left-[-5%]" />
          <div className="bg-orb w-[500px] h-[500px] bg-blue-600 top-[40%] right-[-10%] animation-delay-1000" />
          <div className="bg-orb w-80 h-80 bg-pink-600 bottom-[-5%] left-[30%] animation-delay-2000" />
        </div>
        {children}
      </body>
    </html>
  );
}
