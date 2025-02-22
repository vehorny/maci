/**
 * Utility to calculate the depth of a binary tree
 * @param maxLeaves - the number of leaves in the tree
 * @returns the depth of the tree
 */
export const calcBinaryTreeDepthFromMaxLeaves = (maxLeaves: number) => {
  let result = 0;
  while (2 ** result < maxLeaves) {
    result++;
  }
  return result;
};

/**
 * Utility to calculate the depth of a quin tree
 * @param maxLeaves the number of leaves in the tree
 * @returns the depth of the tree
 */
export const calcQuinTreeDepthFromMaxLeaves = (maxLeaves: number) => {
  let result = 0;
  while (5 ** result < maxLeaves) {
    result++;
  }
  return result;
};
