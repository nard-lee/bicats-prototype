// A promise dropped with `void` that later rejects is an unhandled rejection,
// which crashes the Node process — post-response side effects must swallow.
export function runSideEffect(label: string, task: Promise<unknown>): void {
  task.catch((err: unknown) => {
    console.error(`==> ${label} failed`, err);
  });
}
