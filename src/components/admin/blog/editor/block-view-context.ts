import { createContext, createElement, useContext, type ComponentType } from 'react';
import type { ReactNodeViewProps } from '@tiptap/react';

/** The current node view's props, so BlockFrame can offer duplicate / move. */
export const BlockViewContext = createContext<ReactNodeViewProps | null>(null);

export const useBlockView = () => useContext(BlockViewContext);

/** Wraps a node view so its BlockFrame gets duplicate and reorder controls. */
export function withBlockView(View: ComponentType<ReactNodeViewProps>) {
  const Wrapped = (props: ReactNodeViewProps) =>
    createElement(BlockViewContext.Provider, { value: props }, createElement(View, props));
  Wrapped.displayName = `WithBlockView(${View.displayName || View.name || 'View'})`;
  return Wrapped;
}
