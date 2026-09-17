import type { SourceDocument, SourceReference, Statement, WorkspaceFixture, Qualification } from "./types";

// Entirely authored, synthetic material. No real agreement or personal data.
const sections = [
  ["parties", "Parties & purpose", "This synthetic employment agreement is between Example Employer Private Limited (the Employer) and Example Employee (the Employee). It describes an illustrative role based in Bengaluru, India. It is a product demonstration, not a legal template."],
  ["role", "Role & responsibilities", "The Employee will work as a Product Analyst from 1 April 2026. Responsibilities include preparing product reports and handling company information with care. The usual place of work is Bengaluru. Any change to the usual place of work will be discussed with the Employee."],
  ["pay", "Compensation", "The fixed annual gross compensation is INR 12,00,000, payable in twelve monthly instalments, subject to applicable deductions. A discretionary bonus may be considered following an annual review. No bonus amount or payment date is promised in this agreement."],
  ["probation", "Probation & review", "The first three months are a probation period. The Employer may extend probation where performance requires further assessment. This agreement does not specify a maximum extension period or a written confirmation process."],
  ["expenses", "Work expenses", "Reasonable business travel expenses approved in advance will be reimbursed up to INR 10,000 per month against receipts submitted within 30 days of travel."],
  ["confidentiality", "Confidential information", "Confidential Information means non-public business, customer and technical information received through the role. The Employee must protect this information during employment and after departure. Information already publicly available without a breach is excluded."],
  ["notice", "Ending employment", "Either party may end employment by giving 30 days of written notice. The Employer may agree to an earlier release in writing. The Employee must return company equipment and records on the final working day."],
  ["restrictions", "Customer contact after departure", "For six months after departure, the Employee must not solicit customers with whom they had material contact during employment. Material contact is not further defined in this agreement."],
  ["schedule", "Referenced policy", "Working hours, leave arrangements and remote-work eligibility are described in Schedule A, which forms part of this agreement. Schedule A is not included in this synthetic document set."],
  ["disputes", "Resolving disagreements", "The parties will first discuss a disagreement in good faith. If unresolved within 30 days, either party may request mediation in Bengaluru. This agreement does not describe the procedure after unsuccessful mediation."],
  ["equipment", "Equipment allowance", "The Employee will receive a one-time equipment allowance of INR 15,000 in the first monthly payment."],
  ["changes", "Written changes", "Changes to this agreement must be recorded in writing and acknowledged by both parties. The parties should retain a copy of the agreed changes."],
] as const;

const original: SourceDocument = {
  id: "sample-employment-original", version: "original", versionLabel: "Original",
  title: "Employment agreement", type: "Employment", jurisdiction: "Bengaluru, India",
  parties: ["Example Employer Private Limited", "Example Employee"],
  sections: sections.map(([id, title, text], i) => ({ id, number: String(i + 1).padStart(2, "0"), title, blocks: [{ id: `${id}-body`, text }] })),
};
const revisedText: Record<string, string> = {
  notice: "Either party may end employment by giving 60 days of written notice. The Employer may agree to an earlier release in writing. The Employee must return company equipment and records on the final working day.",
  expenses: "Reasonable business travel expenses approved in advance will be reimbursed up to INR 15,000 per month against receipts submitted within 30 days of travel.",
  probation: "The first three months are a probation period. The Employer may extend probation once for up to three further months, with the reason and review date communicated in writing.",
};
const revised: SourceDocument = {
  ...original, id: "sample-employment-revised", version: "revised", versionLabel: "Revised",
  sections: [
    ...original.sections.filter((s) => s.id !== "equipment").map((s) => ({ ...s, blocks: s.blocks.map((b) => ({ ...b, text: revisedText[s.id] ?? b.text })) })),
    { id: "review", number: "13", title: "Annual compensation review", blocks: [{ id: "review-body", text: "The Employer will hold a compensation review each April. A review does not guarantee an increase in compensation." }] },
  ],
};

// Fixture authoring convenience only: references are fixed before presentation.
// The UI never calls this to recover or repair an invalid reference.
function ref(document: SourceDocument, sectionId: string): SourceReference {
  const block = document.sections.find((s) => s.id === sectionId)!.blocks[0];
  return { documentId: document.id, blockId: block.id, version: document.version, quote: block.text, start: 0, end: block.text.length };
}
const r = (section: string) => ref(original, section);
const v = (section: string) => ref(revised, section);
function statement(id: string, text: string, source: SourceReference, qualification?: Qualification): Statement {
  return { id, text, kind: "supported", basis: "explanation", references: [source], ...(qualification ? { qualification } : {}) };
}
const probationQualification: Qualification = { reason: "not-stated", detail: "The original probation clause gives no maximum extension or confirmation process. The sample cannot establish how an extension would be handled." };
const contactQualification: Qualification = { reason: "ambiguous", detail: "“Material contact” is not defined in this sample. The wording alone does not settle which customer relationships it covers or its enforceability." };
const scheduleQualification: Qualification = { reason: "missing-material", detail: "Schedule A is referenced but absent. Working hours, leave and remote-work terms cannot be established from the supplied sample." };

export const workspaceFixture: WorkspaceFixture = {
  documents: [original, revised], originalId: original.id, revisedId: revised.id,
  overview: {
    ...statement("overview", "An illustrative Product Analyst agreement covering the role, compensation, workplace information and how employment can end. Start with the terms below, then read the clauses behind them.", r("role")),
    references: [r("role"), r("pay"), r("notice")],
  },
  terms: [
    { id: "role", category: "Obligations", label: "Product Analyst · Bengaluru", statement: statement("term-role", "Prepare product reports and handle company information with care. A workplace change is to be discussed with the employee.", r("role")) },
    { id: "salary", category: "Money", label: "INR 12,00,000 per year", statement: statement("term-salary", "Fixed gross compensation is paid in twelve monthly instalments, subject to deductions. The bonus is discretionary, with no promised amount or date.", r("pay")) },
    { id: "expenses", category: "Money", label: "Travel expenses · INR 10,000 monthly cap", statement: statement("term-expenses", "Advance approval and receipts are required. Receipts must be submitted within 30 days of travel.", r("expenses")) },
    { id: "start", category: "Deadlines", label: "Start date · 1 April 2026", statement: { ...statement("term-start", "The Employee will work as a Product Analyst from 1 April 2026.", r("role")), basis: "document-wording" } },
    { id: "probation", category: "Deadlines", label: "Three-month probation", statement: statement("term-probation", "The initial period is three months, with an extension possible under the original wording.", r("probation"), probationQualification) },
    { id: "customers", category: "Restrictions", label: "Customer solicitation · six months", statement: statement("term-customers", "The clause addresses soliciting customers after departure where the employee had “material contact” with them.", r("restrictions"), contactQualification) },
    { id: "notice", category: "Termination", label: "30 days’ written notice", statement: statement("term-notice", "The original clause gives either party a 30-day notice period. Earlier release requires the employer’s written agreement; equipment and records are due back on the last working day.", r("notice")) },
    { id: "mediation", category: "Disputes", label: "Discussion, then possible mediation", statement: statement("term-disputes", "After 30 days of unresolved discussion, either party may request mediation in Bengaluru.", r("disputes"), { reason: "not-stated", detail: "The supplied clause does not describe what follows unsuccessful mediation." }) },
    { id: "confidential", category: "Definitions", label: "Confidential Information", statement: statement("term-definition", "Non-public business, customer and technical information received through the role. Public information obtained without a breach is excluded.", r("confidentiality")) },
  ],
  attention: [
    { id: "extension", title: "Probation can be extended without a stated limit", label: "Clarify the process", statement: statement("attention-probation", "Ask for the extension limit, review date and confirmation process to be recorded.", r("probation"), probationQualification), questionId: "probation" },
    { id: "material-contact", title: "The customer restriction leaves a term undefined", label: "Review the wording", statement: statement("attention-contact", "Clarify what counts as “material contact” and which customers the wording is intended to cover.", r("restrictions"), contactQualification), questionId: "customers" },
    { id: "missing-schedule", title: "Working arrangements depend on a missing schedule", label: "Missing information", statement: statement("attention-schedule", "Request Schedule A before relying on the agreement to explain hours, leave or remote work.", r("schedule"), scheduleQualification), questionId: "schedule" },
  ],
  questions: [
    { id: "notice", question: "How much notice does the original agreement require?", aliases: ["What is the notice period", "How much notice do I need to give", "notice period"], answer: statement("answer-notice", "The original agreement says either party may end employment with 30 days of written notice. An earlier release needs the employer’s written agreement.", r("notice")) },
    { id: "probation", question: "Can the probation period be extended?", aliases: ["Can probation be extended", "How long is probation"], answer: statement("answer-probation", "Yes, the original wording allows an extension where performance needs further assessment, but does not state an extension limit.", r("probation"), probationQualification) },
    { id: "customers", question: "What does the customer restriction cover?", aliases: ["What is material contact", "Can I contact customers after leaving"], answer: statement("answer-customers", "The clause refers to soliciting customers with whom the employee had material contact, for six months after departure. Its scope remains unclear because that term is undefined.", r("restrictions"), contactQualification) },
    { id: "schedule", question: "What are the working hours and leave arrangements?", aliases: ["What are my working hours", "Can I work remotely", "How much leave do I get"], answer: { id: "answer-schedule", kind: "limited", basis: "explanation", text: "The supplied sample does not contain enough information to answer this. The agreement points to Schedule A, which is missing.", references: [r("schedule")], qualification: scheduleQualification } },
    { id: "bonus", question: "Is a bonus guaranteed?", aliases: ["Will I receive a bonus", "Is the bonus guaranteed"], answer: statement("answer-bonus", "The sample describes a discretionary bonus. It promises neither an amount nor a payment date.", r("pay")) },
    { id: "expenses", question: "How are travel expenses reimbursed?", aliases: ["What is the expense limit", "How do I claim expenses"], answer: statement("answer-expenses", "The original clause requires advance approval and receipts within 30 days of travel, with a monthly reimbursement cap of INR 10,000.", r("expenses")) },
  ],
  comparisonCoverage: "A prepared comparison of six selected clauses in two synthetic versions. Other clauses are not assessed here. These explanations are not legal conclusions.",
  comparison: [
    { id: "notice", category: "Termination", title: "Notice period", kind: "changed", original: [r("notice")], revised: [v("notice")], explanation: { ...statement("change-notice", "The written notice period changes from 30 to 60 days for either party. The earlier-release wording is retained.", r("notice")), references: [r("notice"), v("notice")] } },
    { id: "probation", category: "Deadlines", title: "Probation extension", kind: "changed", original: [r("probation")], revised: [v("probation")], explanation: { ...statement("change-probation", "The revision limits an extension to one further period of up to three months and calls for a written reason and review date.", r("probation")), references: [r("probation"), v("probation")] } },
    { id: "expenses", category: "Money", title: "Travel expense cap", kind: "changed", original: [r("expenses")], revised: [v("expenses")], explanation: { ...statement("change-expenses", "The monthly cap rises from INR 10,000 to INR 15,000. Advance approval and the receipt deadline remain in the supplied wording.", r("expenses")), references: [r("expenses"), v("expenses")] } },
    { id: "review", category: "Money", title: "Annual compensation review", kind: "added", original: [], revised: [v("review")], explanation: statement("change-review", "The revised sample adds an April compensation review, expressly without guaranteeing an increase.", v("review")) },
    { id: "equipment", category: "Money", title: "Equipment allowance", kind: "removed", original: [r("equipment")], revised: [], explanation: statement("change-equipment", "The one-time INR 15,000 equipment allowance appears in the original and is omitted from the prepared revised sample.", r("equipment")) },
    { id: "confidentiality", category: "Definitions", title: "Confidential information", kind: "unchanged", original: [r("confidentiality")], revised: [v("confidentiality")], explanation: { ...statement("change-confidentiality", "The definition and protection wording are identical in the two supplied versions.", r("confidentiality")), references: [r("confidentiality"), v("confidentiality")] } },
  ],
};
