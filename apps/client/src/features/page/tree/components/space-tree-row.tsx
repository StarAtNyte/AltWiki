import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { ActionIcon, Checkbox, rem } from "@mantine/core";
import clsx from "clsx";
import {
  IconChevronDown,
  IconChevronRight,
  IconFileDescription,
  IconPlus,
  IconPointFilled,
  IconTable,
} from "@tabler/icons-react";

import EmojiPicker from "@/components/ui/emoji-picker.tsx";
import { queryClient } from "@/main.tsx";
import { buildPageUrl } from "@/features/page/page.utils.ts";
import { getPageTitle } from "@/features/page/page.utils";
import { getPageById } from "@/features/page/services/page-service.ts";
import {
  useUpdatePageMutation,
  fetchAllAncestorChildren,
} from "@/features/page/queries/page-query.ts";
import { useQueryEmit } from "@/features/websocket/use-query-emit.ts";
import { mobileSidebarAtom } from "@/components/layouts/global/hooks/atoms/sidebar-atom.ts";
import { useToggleSidebar } from "@/components/layouts/global/hooks/hooks/use-toggle-sidebar.ts";

import {
  renamingPageIdAtom,
  selectedPageIdsAtom,
  selectionModeAtom,
  treeDataAtom,
} from "@/features/page/tree/atoms/tree-data-atom.ts";
import localEmitter from "@/lib/local-emitter.ts";
import { treeModel } from "@/features/page/tree/model/tree-model";
import { useTreeMutation } from "@/features/page/tree/hooks/use-tree-mutation.ts";
import type { SpaceTreeNode } from "@/features/page/tree/types.ts";
import type { RenderRowProps } from "./doc-tree";
import { NodeMenu } from "./space-tree-node-menu";
import classes from "@/features/page/tree/styles/tree.module.css";
import { updateTreeNodeIcon } from "@/features/page/tree/utils/utils.ts";

type SpaceTreeRowProps = RenderRowProps<SpaceTreeNode> & {
  readOnly: boolean;
};

export function SpaceTreeRow({
  node,
  level,
  isOpen,
  hasChildren,
  toggleOpen,
  rowRef,
  tabIndex,
  treeItemProps,
  readOnly,
}: SpaceTreeRowProps) {
  const { t } = useTranslation();
  const { spaceSlug } = useParams();
  const updatePageMutation = useUpdatePageMutation();
  const [, setTreeData] = useAtom(treeDataAtom);
  const emit = useQueryEmit();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mobileSidebarOpened] = useAtom(mobileSidebarAtom);
  const toggleMobileSidebar = useToggleSidebar(mobileSidebarAtom);

  // AltWiki bulk selection (toggled from the space sidebar).
  const selectionMode = useAtomValue(selectionModeAtom);
  const isBulkSelected = useAtomValue(selectedPageIdsAtom).has(node.id);
  const setSelectedPageIds = useSetAtom(selectedPageIdsAtom);

  const canEdit = !readOnly && node.canEdit !== false;

  // AltWiki inline rename (double-click the title or "Rename" in the menu).
  const [renamingId, setRenamingId] = useAtom(renamingPageIdAtom);
  const isRenaming = canEdit && renamingId === node.id;
  const [draftTitle, setDraftTitle] = useState(node.name ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setDraftTitle(node.name ?? "");
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isRenaming]);

  const renameTree = (nodes: SpaceTreeNode[], title: string): SpaceTreeNode[] =>
    nodes.map((n) =>
      n.id === node.id
        ? { ...n, name: title }
        : n.children?.length
          ? { ...n, children: renameTree(n.children, title) }
          : n,
    );

  const commitRename = async () => {
    const title = draftTitle.trim();
    setRenamingId("");
    if (title === (node.name ?? "").trim()) return;
    setTreeData((prev) => renameTree(prev, title));
    try {
      const page = await updatePageMutation.mutateAsync({
        pageId: node.id,
        title,
      });
      const event = {
        operation: "updateOne" as const,
        spaceId: page.spaceId,
        entity: ["pages"],
        id: page.id,
        payload: {
          title: page.title,
          slugId: page.slugId,
          parentPageId: page.parentPageId,
          icon: page.icon,
        },
      };
      localEmitter.emit("message", event);
      emit(event);
    } catch (err) {
      setTreeData((prev) => renameTree(prev, node.name ?? ""));
      console.error("Rename failed", err);
    }
  };

  const stopForInput = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };
  const pageUrl = buildPageUrl(spaceSlug, node.slugId, node.name);

  const prefetchPage = () => {
    timerRef.current = setTimeout(async () => {
      const page = await queryClient.fetchQuery({
        queryKey: ["pages", node.id],
        queryFn: () => getPageById({ pageId: node.id }),
        staleTime: 5 * 60 * 1000,
      });
      if (page?.slugId) {
        queryClient.setQueryData(["pages", page.slugId], page);
      }
    }, 150);
  };

  const cancelPagePrefetch = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleUpdateNodeIcon = (nodeId: string, newIcon: string | null) => {
    setTreeData((prev) =>
      updateTreeNodeIcon(prev, nodeId, newIcon),
    );
  };

  const handleEmojiIconClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleEmojiSelect = (emoji: { native: string }) => {
    handleUpdateNodeIcon(node.id, emoji.native);
    updatePageMutation
      .mutateAsync({ pageId: node.id, icon: emoji.native })
      .then((data) => {
        setTimeout(() => {
          emit({
            operation: "updateOne",
            spaceId: node.spaceId,
            entity: ["pages"],
            id: node.id,
            payload: { icon: emoji.native, parentPageId: data.parentPageId },
          });
        }, 50);
      });
  };

  const handleRemoveEmoji = () => {
    handleUpdateNodeIcon(node.id, null);
    updatePageMutation.mutateAsync({ pageId: node.id, icon: null });

    setTimeout(() => {
      emit({
        operation: "updateOne",
        spaceId: node.spaceId,
        entity: ["pages"],
        id: node.id,
        payload: { icon: null },
      });
    }, 50);
  };

  const handleLoadChildren = async () => {
    if (!node.hasChildren) return;
    try {
      const childrenTree = await fetchAllAncestorChildren({
        pageId: node.id,
        spaceId: node.spaceId,
      });
      setTreeData((prev) =>
        treeModel.appendChildren(prev, node.id, childrenTree),
      );
    } catch (error) {
      console.error("Failed to fetch children:", error);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });
  };

  return (
    <Link
      ref={rowRef as React.Ref<HTMLAnchorElement>}
      to={pageUrl}
      className={clsx(classes.node, isBulkSelected && classes.bulkSelected)}
      style={{ "--tree-level": level } as React.CSSProperties}
      tabIndex={tabIndex}
      {...treeItemProps}
      onDoubleClick={(e) => {
        if (!canEdit || selectionMode) return;
        e.preventDefault();
        e.stopPropagation();
        setRenamingId(node.id);
      }}
      onClick={(e) => {
        if (isRenaming) {
          e.preventDefault();
          return;
        }
        // AltWiki: opening a page also reveals its children (never
        // collapses it); the chevron keeps toggling independently.
        if (!isOpen && hasChildren) {
          toggleOpen();
        }
        if (mobileSidebarOpened) {
          toggleMobileSidebar();
        }
      }}
      onMouseEnter={prefetchPage}
      onMouseLeave={cancelPagePrefetch}
    >
      {canEdit && selectionMode && (
        <div
          className={clsx(classes.checkbox, classes.checkboxVisible)}
          onClick={handleCheckboxClick}
        >
          <Checkbox
            size="xs"
            checked={isBulkSelected}
            onChange={() => {}}
            onClick={handleCheckboxClick}
            aria-label={t("Select page")}
            tabIndex={-1}
          />
        </div>
      )}

      <PageArrow
        isOpen={isOpen}
        hasChildren={hasChildren}
        onToggle={toggleOpen}
      />

      <div onClick={handleEmojiIconClick} style={{ marginRight: "4px" }}>
        <EmojiPicker
          onEmojiSelect={handleEmojiSelect}
          icon={
            node.icon ? (
              node.icon
            ) : node.isBase ? (
              <IconTable size={18} />
            ) : (
              <IconFileDescription size="18" />
            )
          }
          readOnly={!canEdit}
          removeEmojiAction={handleRemoveEmoji}
          actionIconProps={{ tabIndex: -1 }}
        />
      </div>

      {isRenaming ? (
        <input
          ref={inputRef}
          className={classes.renameInput}
          value={draftTitle}
          aria-label={t("Rename page")}
          placeholder={t("untitled")}
          onChange={(e) => setDraftTitle(e.currentTarget.value)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDoubleClick={stopForInput}
          onMouseDown={stopForInput}
          onPointerDown={stopForInput}
          onDragStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
              e.preventDefault();
              commitRename();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setRenamingId("");
            }
          }}
          onBlur={commitRename}
        />
      ) : (
        <span className={classes.text}>{getPageTitle(node.name, node.isBase, t)}</span>
      )}

      <div className={classes.actions}>
        <NodeMenu node={node} canEdit={canEdit} />

        {canEdit && (
          <CreateNode
            node={node}
            isOpen={isOpen}
            hasChildren={hasChildren}
            onToggle={toggleOpen}
            onExpandTree={handleLoadChildren}
          />
        )}
      </div>
    </Link>
  );
}

interface PageArrowProps {
  isOpen: boolean;
  hasChildren: boolean;
  onToggle: () => void;
}

function PageArrow({ isOpen, hasChildren, onToggle }: PageArrowProps) {
  const { t } = useTranslation();

  if (!hasChildren) {
    return (
      <span
        aria-hidden
        className={classes.actionIcon}
        style={{
          width: 20,
          height: 20,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <IconPointFilled size={8} />
      </span>
    );
  }

  return (
    <ActionIcon
      size={20}
      variant="subtle"
      color="gray"
      className={classes.actionIcon}
      aria-label={isOpen ? t("Collapse") : t("Expand")}
      aria-expanded={isOpen}
      tabIndex={-1}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
    >
      {isOpen ? (
        <IconChevronDown stroke={2} size={18} />
      ) : (
        <IconChevronRight stroke={2} size={18} />
      )}
    </ActionIcon>
  );
}

interface CreateNodeProps {
  node: SpaceTreeNode;
  isOpen: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  onExpandTree: () => Promise<void> | void;
}

function CreateNode({
  node,
  isOpen,
  hasChildren,
  onToggle,
  onExpandTree,
}: CreateNodeProps) {
  const { t } = useTranslation();
  const { handleCreate } = useTreeMutation(node.spaceId);

  async function handleClickCreate() {
    if (node.hasChildren && !hasChildren) {
      // Expand and lazy-load before creating a child. handleCreate reads the
      // latest tree imperatively (via useStore) so we no longer need a
      // setTimeout to wait for React to rerun the closure with fresh data.
      if (!isOpen) onToggle();
      await onExpandTree();
    } else if (!isOpen) {
      onToggle();
    }
    handleCreate(node.id);
  }

  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      className={classes.actionIcon}
      aria-label={t("Create subpage of {{name}}", { name: node.name || t("untitled") })}
      tabIndex={-1}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleClickCreate();
      }}
    >
      <IconPlus style={{ width: rem(20), height: rem(20) }} stroke={2} />
    </ActionIcon>
  );
}
