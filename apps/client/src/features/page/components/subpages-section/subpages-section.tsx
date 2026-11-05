import { useEffect, useMemo, useState } from "react";
import { Button, Container, Skeleton, Text, UnstyledButton } from "@mantine/core";
import {
  IconArrowRight,
  IconFileDescription,
  IconFolder,
  IconPencilPlus,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAtomValue } from "jotai";
import clsx from "clsx";
import { useGetSidebarPagesQuery } from "@/features/page/queries/page-query.ts";
import { buildPageUrl } from "@/features/page/page.utils.ts";
import { pageEditorAtom } from "@/features/editor/atoms/editor-atoms.ts";
import { userAtom } from "@/features/user/atoms/current-user-atom.ts";
import { queryClient } from "@/main.tsx";
import { IPage } from "@/features/page/types/page.types.ts";
import { IPagination } from "@/lib/types.ts";
import { timeAgo } from "@/lib/time.ts";
import classes from "./subpages-section.module.css";

interface Props {
  pageId: string;
  spaceId: string;
  spaceSlug: string;
  content: unknown;
}

// A doc counts as empty when it only holds empty paragraphs.
function isEmptyDoc(content: unknown): boolean {
  let doc: any = content;
  if (!doc) return true;
  if (typeof doc === "string") {
    try {
      doc = JSON.parse(doc);
    } catch {
      return doc.trim().length === 0;
    }
  }
  const nodes: any[] = doc?.content ?? [];
  return nodes.every(
    (n) => n?.type === "paragraph" && (!n.content || n.content.length === 0),
  );
}

/**
 * Lists the direct subpages of a page below the editor. It is rendered
 * outside the ProseMirror document, so nothing is written into page content.
 */
export default function SubpagesSection({
  pageId,
  spaceId,
  spaceSlug,
  content,
}: Props) {
  const { t } = useTranslation();
  const editor = useAtomValue(pageEditorAtom);
  const user = useAtomValue(userAtom);
  const fullPageWidth = user?.settings?.preferences?.fullPageWidth;

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useGetSidebarPagesQuery({ pageId, spaceId });

  const [empty, setEmpty] = useState(() => isEmptyDoc(content));
  const [editable, setEditable] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const sync = () => {
      setEmpty(editor.isEmpty);
      setEditable(editor.isEditable);
    };
    sync();
    editor.on("update", sync);
    editor.on("transaction", sync);
    return () => {
      editor.off("update", sync);
      editor.off("transaction", sync);
    };
  }, [editor]);

  const children = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.items) as IPage[],
    [data],
  );

  // Last-updated times only from data already in the cache (no extra fetch).
  const updatedAt = useMemo(() => {
    const map = new Map<string, Date>();
    for (const key of [["recent-changes", spaceId], ["recent-changes", undefined]]) {
      const cached = queryClient.getQueryData<IPagination<IPage>>(key);
      cached?.items?.forEach((p) => {
        if (!map.has(p.id)) map.set(p.id, p.updatedAt);
      });
    }
    return map;
  }, [spaceId, data]);

  if (isLoading) {
    return null;
  }
  if (children.length === 0) return null;

  return (
    <Container
      fluid={fullPageWidth}
      size={!fullPageWidth && 820}
      className={clsx(classes.root, empty && classes.asMain)}
      data-subpages
    >
      {empty && editable && (
        <UnstyledButton
          className={classes.hint}
          onClick={() => editor?.chain().focus("start").run()}
        >
          <IconPencilPlus size={16} />
          <span>
            <strong>{t("Add an overview")}</strong>
            <span className={classes.hintSub}>
              {" "}
              {t("— introduce this section, or jump into a page below.")}
            </span>
          </span>
        </UnstyledButton>
      )}

      <div className={classes.header}>
        <span className={classes.label}>{t("In this section")}</span>
        <span className={classes.count}>{children.length}</span>
      </div>

      <div className={classes.grid}>
        {children.map((child) => {
          const updated = updatedAt.get(child.id);
          return (
            <Link
              key={child.id}
              to={buildPageUrl(spaceSlug, child.slugId, child.title)}
              className={classes.card}
            >
              <span className={classes.icon}>
                {child.icon ||
                  (child.hasChildren ? (
                    <IconFolder size={18} stroke={1.6} />
                  ) : (
                    <IconFileDescription size={18} stroke={1.6} />
                  ))}
              </span>
              <span className={classes.body}>
                <span className={classes.title}>
                  {child.title || t("Untitled")}
                </span>
                {(updated || child.hasChildren) && (
                  <span className={classes.meta}>
                    {updated
                      ? t("Updated {{time}}", { time: timeAgo(updated) })
                      : t("Has subpages")}
                  </span>
                )}
              </span>
              <IconArrowRight size={14} className={classes.go} />
            </Link>
          );
        })}
        {isFetchingNextPage &&
          Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} height={62} radius="md" />
          ))}
      </div>

      {hasNextPage && !isFetchingNextPage && (
        <Button
          variant="subtle"
          color="gray"
          size="compact-sm"
          mt="sm"
          onClick={() => fetchNextPage()}
        >
          {t("Show more")}
        </Button>
      )}
    </Container>
  );
}

