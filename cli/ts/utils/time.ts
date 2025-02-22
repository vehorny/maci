/**
 * Stop the current thread for n milliseconds
 * @param ms the number of milliseconds to sleep for
 * @returns a promise that resolves after the specified number of milliseconds
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve: any) => setTimeout(resolve, ms));
};
