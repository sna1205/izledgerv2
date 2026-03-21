export const MIN_LOADING_DELAY_MS = 400;

export function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function withMinimumDelay<T>(
  operation: Promise<T> | (() => Promise<T>),
  ms = MIN_LOADING_DELAY_MS,
) {
  const promise = typeof operation === "function" ? operation() : operation;
  const [result] = await Promise.all([promise, delay(ms)]);
  return result;
}
