import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { SpaceTreeNode } from "@/features/page/tree/types";
import { appendNodeChildren } from "../utils";

export type SortOrder = "alphabetical-asc" | "alphabetical-desc" | "created-newest" | "created-oldest" | "modified-newest" | "modified-oldest";

export const treeDataAtom = atom<SpaceTreeNode[]>([]);
export const selectedPageIdsAtom = atom<Set<string>>(new Set<string>());
export const sortOrderAtom = atomWithStorage<SortOrder>("page-sort-order", "alphabetical-asc");

// Atom
export const appendNodeChildrenAtom = atom(
  null,
  (
    get,
    set,
    { parentId, children }: { parentId: string; children: SpaceTreeNode[] }
  ) => {
    const currentTree = get(treeDataAtom);
    const updatedTree = appendNodeChildren(currentTree, parentId, children);
    set(treeDataAtom, updatedTree);
  }
);
