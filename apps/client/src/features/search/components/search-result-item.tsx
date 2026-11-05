import React from "react";
import {
  ActionIcon,
  Tooltip,
  getDefaultZIndex,
} from "@mantine/core";
import { Spotlight } from "@mantine/spotlight";
import { Link } from "react-router-dom";
import { IconFile, IconDownload, IconFileText } from "@tabler/icons-react";
import { buildPageUrl } from "@/features/page/page.utils";
import { getSpaceColor } from "@/lib/space-color.ts";
import { spotlightClasses as classes } from "./spotlight-classes.ts";
import {
  IAttachmentSearch,
  IPageSearch,
} from "@/features/search/types/search.types";
import DOMPurify from "dompurify";
import { useTranslation } from "react-i18next";

function SpaceTag({ space }: { space: { id?: string; name?: string } }) {
  const color = getSpaceColor(space);
  return (
    <span
      className={classes.tag}
      style={{ background: color.tagBg, color: color.tagText }}
    >
      {space.name}
    </span>
  );
}

interface SearchResultItemProps {
  result: IPageSearch | IAttachmentSearch;
  isAttachmentResult: boolean;
  showSpace?: boolean;
}

export function SearchResultItem({
  result,
  isAttachmentResult,
  showSpace,
}: SearchResultItemProps) {
  const { t } = useTranslation();

  if (isAttachmentResult) {
    const attachmentResult = result as IAttachmentSearch;

    const handleDownload = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const downloadUrl = `/api/files/${attachmentResult.id}/${attachmentResult.fileName}`;
      window.open(downloadUrl, "_blank");
    };

    return (
      <Spotlight.Action
        component={Link}
        //@ts-ignore
        to={buildPageUrl(
          attachmentResult.space.slug,
          attachmentResult.page.slugId,
          attachmentResult.page.title,
        )}
        style={{ userSelect: "none" }}
      >
        <div className={classes.row}>
          <span className={classes.rowIcon} aria-hidden>
            <IconFile size={18} stroke={1.5} />
          </span>

          <div className={classes.rowBody}>
            <span className={classes.rowLine}>
              <span className={classes.rowTitle}>
                {attachmentResult.fileName}
              </span>
              {attachmentResult.space?.name && (
                <SpaceTag space={attachmentResult.space} />
              )}
            </span>
            <span className={classes.meta}>{attachmentResult.page.title}</span>

            {attachmentResult?.highlight && (
              <div
                className={classes.meta}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(attachmentResult.highlight, {
                    ALLOWED_TAGS: ["mark", "em", "strong", "b"],
                    ALLOWED_ATTR: [],
                  }),
                }}
              />
            )}
          </div>

          <Tooltip
            label={t("Download attachment")}
            zIndex={getDefaultZIndex("max")}
            withArrow
          >
            <ActionIcon variant="subtle" color="gray" onClick={handleDownload}>
              <IconDownload size={18} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
        </div>
      </Spotlight.Action>
    );
  } else {
    const pageResult = result as IPageSearch;
    return (
      <Spotlight.Action
        component={Link}
        //@ts-ignore
        to={buildPageUrl(
          pageResult.space.slug,
          pageResult.slugId,
          pageResult.title,
        )}
        style={{ userSelect: "none" }}
      >
        <div className={classes.row}>
          <span className={classes.rowIcon} aria-hidden>
            {pageResult?.icon || <IconFileText size={18} stroke={1.5} />}
          </span>

          <div className={classes.rowBody}>
            <span className={classes.rowLine}>
              <span className={classes.rowTitle}>
                {pageResult.title || t("Untitled")}
              </span>
              {showSpace && pageResult.space?.name && (
                <SpaceTag space={pageResult.space} />
              )}
            </span>

            {pageResult?.highlight && (
              <div
                className={classes.meta}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(pageResult.highlight, {
                    ALLOWED_TAGS: ["mark", "em", "strong", "b"],
                    ALLOWED_ATTR: [],
                  }),
                }}
              />
            )}
          </div>
        </div>
      </Spotlight.Action>
    );
  }
}
