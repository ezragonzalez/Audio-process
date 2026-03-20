export interface Utterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface TranscriptionResult {
  id: string;
  transcriptId?: string; // AssemblyAI transcript ID for LeMUR
  fileName: string;
  date: string;
  duration: number;
  utterances: Utterance[];
  fullText: string;
  speakerCount: number;
  speakerLabels: Record<string, string>;
  cost: {
    transcription: number;
    summary: number;
    total: number;
  };
}

export interface MeetingSummary {
  id: string;
  transcriptionId: string;
  type: SummaryType;
  content: string;
  generatedAt: string;
  cost: number;
}

export type SummaryType =
  | "overview"
  | "speaker-breakdown"
  | "action-items"
  | "sales-meeting"
  | "team-meeting"
  | "presentation";

export interface SummaryTypeConfig {
  type: SummaryType;
  label: string;
  description: string;
  icon: string;
  prompt: string;
}

export const SUMMARY_TYPES: SummaryTypeConfig[] = [
  {
    type: "overview",
    label: "Meeting Overview",
    description: "General summary with key discussion points and outcomes",
    icon: "FileText",
    prompt: `Analyze this meeting transcription and provide a comprehensive overview:

1. **Meeting Topic**: What was the meeting about?
2. **Key Discussion Points**: List the main topics discussed
3. **Decisions Made**: What decisions were reached?
4. **Outcomes & Results**: What were the conclusions?
5. **Notable Quotes**: Any particularly important statements

Format the response in clean markdown.`,
  },
  {
    type: "speaker-breakdown",
    label: "Speaker Breakdown",
    description: "What each speaker discussed and their key points",
    icon: "Users",
    prompt: `Analyze this meeting transcription and provide a detailed breakdown BY SPEAKER:

For each speaker:
- **Overall Points**: What were their main arguments/contributions?
- **Key Statements**: Their most important points
- **Tone & Position**: Were they agreeable, questioning, leading, etc.?
- **Topics They Raised**: What subjects did they bring up?

Format the response in clean markdown with clear speaker sections.`,
  },
  {
    type: "action-items",
    label: "Action Items & To-Do",
    description: "Checklist of follow-up tasks and action items",
    icon: "CheckSquare",
    prompt: `Analyze this meeting transcription and extract ALL action items, follow-ups, and to-do items:

Create a structured checklist with:
- [ ] **Task description** — Assigned to: [Speaker if mentioned] — Priority: [High/Medium/Low]
- Any deadlines or timelines mentioned
- Follow-up meetings or calls needed
- Documents or deliverables to be created
- People to contact or loop in

Group by priority (High, Medium, Low). Format in clean markdown.`,
  },
  {
    type: "sales-meeting",
    label: "Sales Meeting",
    description: "Sales-focused summary with prospects, objections, and next steps",
    icon: "TrendingUp",
    prompt: `Analyze this meeting transcription as a SALES MEETING and provide:

1. **Prospect/Client Info**: Who is the prospect and what is their business?
2. **Pain Points Discussed**: What problems does the prospect have?
3. **Solutions Presented**: What was offered to address their needs?
4. **Objections Raised**: Any concerns or pushback from the prospect?
5. **Pricing Discussion**: Any pricing or budget conversations?
6. **Buying Signals**: Positive indicators from the prospect
7. **Next Steps**: Agreed-upon follow-up actions
8. **Deal Assessment**: Overall assessment of the opportunity

Format in clean markdown.`,
  },
  {
    type: "team-meeting",
    label: "Team Meeting",
    description: "Team meeting notes with updates, blockers, and assignments",
    icon: "Users",
    prompt: `Analyze this meeting transcription as a TEAM MEETING and provide:

1. **Team Updates**: Status updates shared by each team member
2. **Blockers & Challenges**: Issues raised that need resolution
3. **Decisions Made**: Any team decisions
4. **Project Status**: Progress on ongoing projects
5. **Resource Needs**: Any resource or support requests
6. **Assignments**: Tasks assigned to specific people
7. **Next Meeting Topics**: Items deferred or to follow up on

Format in clean markdown.`,
  },
  {
    type: "presentation",
    label: "Presentation Notes",
    description: "Notes from a presentation with key takeaways and Q&A",
    icon: "Presentation",
    prompt: `Analyze this meeting transcription as a PRESENTATION and provide:

1. **Presenter(s)**: Who presented?
2. **Topic & Purpose**: What was the presentation about?
3. **Key Takeaways**: The most important points made
4. **Data & Evidence**: Any statistics, data, or evidence presented
5. **Q&A Summary**: Questions asked and answers given
6. **Audience Reactions**: Notable responses or feedback
7. **Resources Mentioned**: Any tools, links, or references cited

Format in clean markdown.`,
  },
];
