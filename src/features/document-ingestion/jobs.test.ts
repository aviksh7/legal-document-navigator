import { describe, expect, it } from "vitest";
import { LatestJob } from "./jobs";

describe("latest intake ownership", () => {
  it("aborts replacement work and prevents late progress/results from winning", async () => {
    const jobs = new LatestJob();
    const first = jobs.start();
    const second = jobs.start();
    expect(first.signal.aborted).toBe(true);
    expect(jobs.owns(first)).toBe(false);
    expect(jobs.owns(second)).toBe(true);
    const results: string[] = [];
    await Promise.resolve().then(() => { if (jobs.owns(first)) results.push("stale"); });
    if (jobs.owns(second)) results.push("current");
    expect(results).toEqual(["current"]);
    jobs.cancel();
    expect(second.signal.aborted).toBe(true);
    expect(jobs.owns(second)).toBe(false);
  });
  it("clears ownership even when cancellation races a finished parser", () => {
    const jobs = new LatestJob(); const job = jobs.start();
    jobs.cancel(); jobs.cancel();
    expect(jobs.owns(job)).toBe(false);
    expect(jobs.owns(jobs.start())).toBe(true);
  });
});
