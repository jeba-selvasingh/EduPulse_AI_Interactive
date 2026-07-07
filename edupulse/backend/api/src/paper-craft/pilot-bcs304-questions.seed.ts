/** Pilot question stems keyed by syllabus module number (BCS304 Data Structures). */
export const PILOT_BCS304_QUESTION_STEMS: Record<
  number,
  Array<{ text: string; bloomHint?: 1 | 2 | 3 | 4 | 5 }>
> = {
  1: [
    {
      text: 'With a neat diagram, explain the ADT of a circular queue and its operations.',
      bloomHint: 2,
    },
    {
      text: 'Define an array ADT and analyze the time complexity of insertion and deletion operations.',
      bloomHint: 2,
    },
    {
      text: 'Compare stack and queue applications with suitable examples from system software.',
      bloomHint: 3,
    },
  ],
  2: [
    {
      text: 'Develop an algorithm for insertion sort and trace it with a suitable example.',
      bloomHint: 3,
    },
    {
      text: 'Explain singly linked list operations with diagrams. Write algorithms for insert and delete.',
      bloomHint: 3,
    },
    {
      text: 'Discuss advantages and disadvantages of linked lists over arrays for dynamic datasets.',
      bloomHint: 2,
    },
  ],
  3: [
    {
      text: 'Develop a program to construct an AVL tree with all rotations illustrated.',
      bloomHint: 4,
    },
    {
      text: 'Explain BST search, insert, and delete with time complexity analysis.',
      bloomHint: 3,
    },
    {
      text: 'Compare inorder, preorder, and postorder traversals with one application each.',
      bloomHint: 2,
    },
  ],
  4: [
    {
      text: 'Explain BFS and DFS traversal algorithms on a weighted graph with an example.',
      bloomHint: 3,
    },
    {
      text: "Apply Dijkstra's algorithm to find the shortest path between two vertices.",
      bloomHint: 4,
    },
    {
      text: 'Discuss applications of minimum spanning trees in network design.',
      bloomHint: 2,
    },
  ],
};

export function poTagForModule(moduleNumber: number): string {
  const po = ((moduleNumber % 5) + 2);
  return `PO${po}`;
}

export function coTagForModule(moduleNumber: number): string {
  return `CO${moduleNumber}`;
}
