import { handleAi } from "@/features/document-ai/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export function POST(request: Request) { return handleAi("understand", request); }
