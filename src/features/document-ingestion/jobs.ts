/** One local job owns progress/results. Cancelling also invalidates completed promises. */
export class LatestJob {
  private current: AbortController | null = null;
  start() {
    this.cancel();
    this.current = new AbortController();
    return this.current;
  }
  owns(job: AbortController) { return this.current === job && !job.signal.aborted; }
  cancel() { this.current?.abort(); this.current = null; }
}
