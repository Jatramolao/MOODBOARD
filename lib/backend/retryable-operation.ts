/** Keeps the identity of an unconfirmed versioned operation across retries. */
export function createRetryableOperation<T, R>(send: (value: T) => Promise<R>, retain: (error: unknown) => boolean = () => true) {
  let pending: { value: T } | undefined;
  return {
    hasPending: () => pending !== undefined,
    async run(value: T) {
      pending ??= { value };
      try {
        const result = await send(pending.value);
        pending = undefined;
        return result;
      } catch (error) {
        if (!retain(error)) pending = undefined;
        throw error;
      }
    },
  };
}
