import { Skeleton } from "@mantine/core";
import {
  IconArrowRight,
  IconBook2,
  IconFileText,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAtomValue } from "jotai";
import clsx from "clsx";
import { useRecentChangesQuery } from "@/features/page/queries/page-query.ts";
import { userAtom } from "@/features/user/atoms/current-user-atom.ts";
import { buildPageUrl } from "@/features/page/page.utils.ts";
import { timeAgo } from "@/lib/time.ts";
import { getFileUrl } from "@/lib/config.ts";
import {
  backgroundAtom,
  backgroundImage,
} from "@/features/background/background.ts";
import classes from "./home.module.css";

export default function ContinueReadingTile() {
  const { t } = useTranslation();
  const user = useAtomValue(userAtom);
  const bg = useAtomValue(backgroundAtom);
  const { data, isLoading } = useRecentChangesQuery();

  const items = data?.pages?.[0]?.items ?? [];
  // Prefer the last page this user touched; fall back to the latest change.
  const page =
    items.find((p) => p.lastUpdatedById === user?.id) ?? items[0] ?? null;
  const isMine = page && page.lastUpdatedById === user?.id;
  const more = page
    ? items
        .filter((p) => p.spaceId === page.spaceId && p.id !== page.id)
        .slice(0, 2)
    : [];
  const pageUrl = page
    ? buildPageUrl(page.space?.slug, page.slugId, page.title)
    : null;

  // Page cover if the page has one, else a crop of the current background.
  const cover = page?.coverPhoto ? getFileUrl(page.coverPhoto) : null;
  const crop = backgroundImage(bg);
  const thumbStyle = cover
    ? { backgroundImage: `url("${cover}")` }
    : crop
      ? { backgroundImage: `url("${crop}")` }
      : undefined;

  return (
    <section className={clsx(classes.glass, classes.sidePanel, classes.continue)}>
      <div className={classes.panelHead}>
        <h2 className={classes.panelTitle}>
          <IconBook2 size={18} stroke={1.6} className={classes.panelIcon} />
          {t("Continue reading")}
        </h2>
        {pageUrl && (
          <Link
            to={pageUrl}
            className={classes.roundLink}
            aria-label={t("Open page")}
          >
            <IconArrowRight size={15} stroke={1.75} />
          </Link>
        )}
      </div>

      {isLoading && (
        <div className={classes.continueMain}>
          <Skeleton width={88} height={88} radius={12} />
          <div className={classes.continueText} style={{ flex: 1 }}>
            <Skeleton height={14} width="85%" radius="sm" mb={8} />
            <Skeleton height={12} width="50%" radius="sm" />
          </div>
        </div>
      )}

      {!isLoading && !page && (
        <div>
          <div className={classes.emptyTitle}>{t("Nothing to pick up yet")}</div>
          <div className={classes.emptyText}>
            {t("Pages you edit will show up here so you can jump back in.")}
          </div>
        </div>
      )}

      {!isLoading && page && (
        <>
          <Link to={pageUrl} className={classes.continueMain}>
            <span
              className={clsx(
                classes.thumb,
                cover ? classes.thumbCover : classes.thumbCrop,
              )}
              style={thumbStyle}
              aria-hidden
            >
              {!thumbStyle && <IconFileText size={22} stroke={1.4} />}
            </span>
            <span className={classes.continueText}>
              <span className={classes.continueTitle}>
                {page.icon && (
                  <span className={classes.continueEmoji}>{page.icon}</span>
                )}
                {page.title || t("Untitled")}
              </span>
              <span className={classes.metaLine}>
                {page.space?.name}
                {" · "}
                {isMine
                  ? t("You edited {{time}}", { time: timeAgo(page.updatedAt) })
                  : t("Updated {{time}}", { time: timeAgo(page.updatedAt) })}
              </span>
            </span>
          </Link>

          {more.length > 0 && (
            <>
              <div className={classes.hr} />
              <div className={classes.moreLabel}>
                {t("Also in {{space}}", { space: page.space?.name })}
              </div>
              {more.map((p) => (
                <Link
                  key={p.id}
                  to={buildPageUrl(p.space?.slug, p.slugId, p.title)}
                  className={classes.moreItem}
                >
                  <span className={classes.moreIcon}>
                    {p.icon || <IconFileText size={16} stroke={1.5} />}
                  </span>
                  <span className={classes.moreTitle}>
                    {p.title || t("Untitled")}
                  </span>
                </Link>
              ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
