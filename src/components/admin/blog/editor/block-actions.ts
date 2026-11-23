import type { NodeViewProps } from './BlockFrame';

/** The node's current position, or null if the view has been detached. */
const posOf = (p: NodeViewProps): number | null => {
  const pos = typeof p.getPos === 'function' ? p.getPos() : undefined;
  return typeof pos === 'number' ? pos : null;
};

/** Inserts an identical copy of the block right after it. */
export function duplicateBlock(p: NodeViewProps) {
  const pos = posOf(p);
  if (pos === null) return;
  p.editor.chain().focus().insertContentAt(pos + p.node.nodeSize, p.node.toJSON()).run();
}

/** Whether the block has a sibling to swap with in that direction. */
export function canMoveBlock(p: NodeViewProps, dir: -1 | 1): boolean {
  const pos = posOf(p);
  if (pos === null) return false;
  const $pos = p.editor.state.doc.resolve(pos);
  const index = $pos.index();
  return dir < 0 ? index > 0 : index < $pos.parent.childCount - 1;
}

/** Swaps the block with its previous (-1) or next (+1) sibling, as one undoable step. */
export function moveBlock(p: NodeViewProps, dir: -1 | 1) {
  const pos = posOf(p);
  if (pos === null || !canMoveBlock(p, dir)) return;
  const { state, view } = p.editor;
  const $pos = state.doc.resolve(pos);
  const node = p.node;
  const tr = state.tr;
  if (dir < 0) {
    const prev = $pos.parent.child($pos.index() - 1);
    tr.delete(pos, pos + node.nodeSize).insert(pos - prev.nodeSize, node);
  } else {
    const next = $pos.parent.child($pos.index() + 1);
    tr.delete(pos, pos + node.nodeSize).insert(pos + next.nodeSize, node);
  }
  view.dispatch(tr.scrollIntoView());
}
