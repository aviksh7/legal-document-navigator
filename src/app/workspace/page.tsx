import type { Metadata } from "next";
import { Workspace } from "@/features/document-workspace/workspace";
import { workspaceFixture } from "@/features/document-workspace/fixtures";

export const metadata: Metadata = { title: "Employment agreement · Legal Document Navigator" };
export default function WorkspacePage() {
  return <Workspace initialFixture={workspaceFixture} />;
}
