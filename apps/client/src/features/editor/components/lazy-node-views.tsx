import { lazy, Suspense, type ComponentType } from "react";
import type { NodeViewProps } from "@tiptap/react";

/**
 * Node views backed by heavy libraries (excalidraw, drawio, katex) are loaded
 * on demand: their code is only fetched when a page actually contains (or
 * inserts) such a node, keeping it out of the editor's base chunk.
 */
function lazyNodeView(
  load: () => Promise<{ default: ComponentType<NodeViewProps> }>,
): ComponentType<NodeViewProps> {
  const View = lazy(load);
  function LazyNodeView(props: NodeViewProps) {
    return (
      <Suspense fallback={null}>
        <View {...props} />
      </Suspense>
    );
  }
  return LazyNodeView;
}

export const LazyExcalidrawView = lazyNodeView(
  () => import("@/features/editor/components/excalidraw/excalidraw-view.tsx"),
);

export const LazyDrawioView = lazyNodeView(
  () => import("@/features/editor/components/drawio/drawio-view.tsx"),
);

export const LazyMathInlineView = lazyNodeView(
  () => import("@/features/editor/components/math/math-inline.tsx"),
);

export const LazyMathBlockView = lazyNodeView(
  () => import("@/features/editor/components/math/math-block.tsx"),
);
