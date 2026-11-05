import { Spotlight } from "@mantine/spotlight";
import { IconFileText, IconSearch } from "@tabler/icons-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useDebouncedValue } from "@mantine/hooks";
import { useShareSearchQuery } from "@/features/search/queries/search-query";
import { buildSharedPageUrl } from "@/features/page/page.utils.ts";
import { useTranslation } from "react-i18next";
import { shareSearchSpotlightStore } from "@/features/search/constants.ts";
import DOMPurify from "dompurify";
import {
  spotlightClassNames,
  spotlightClasses as classes,
} from "./spotlight-classes.ts";

interface ShareSearchSpotlightProps {
  shareId?: string;
}
export function ShareSearchSpotlight({ shareId }: ShareSearchSpotlightProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [debouncedSearchQuery] = useDebouncedValue(query, 300);

  const { data: searchResults } = useShareSearchQuery({
    query: debouncedSearchQuery,
    shareId,
  });

  const pages = (
    searchResults && searchResults.length > 0 ? searchResults : []
  ).map((page) => (
    <Spotlight.Action
      key={page.id}
      component={Link}
      //@ts-ignore
      to={buildSharedPageUrl({
        shareId: shareId,
        pageTitle: page.title,
        pageSlugId: page.slugId,
      })}
      style={{ userSelect: "none" }}
    >
      <div className={classes.row}>
        <span className={classes.rowIcon} aria-hidden>
          {page?.icon || <IconFileText size={18} stroke={1.5} />}
        </span>

        <div className={classes.rowBody}>
          <span className={classes.rowTitle}>{page.title}</span>

          {page?.highlight && (
            <div
              className={classes.meta}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(page.highlight, {
                  ALLOWED_TAGS: ["mark", "em", "strong", "b"],
                  ALLOWED_ATTR: []
                }),
              }}
            />
          )}
        </div>
      </div>
    </Spotlight.Action>
  ));

  return (
    <>
      <Spotlight.Root
        store={shareSearchSpotlightStore}
        query={query}
        onQueryChange={setQuery}
        scrollable
        radius={18}
        classNames={spotlightClassNames}
        overlayProps={{ backgroundOpacity: 0 }}
      >
        <div className={classes.header}>
          <Spotlight.Search
            placeholder={t("Search...")}
            leftSection={<IconSearch size={18} stroke={1.5} />}
            leftSectionWidth={44}
          />
        </div>
        <Spotlight.ActionsList>
          {query.length === 0 && pages.length === 0 && (
            <Spotlight.Empty>{t("Start typing to search...")}</Spotlight.Empty>
          )}

          {query.length > 0 && pages.length === 0 && (
            <Spotlight.Empty>{t("No results found...")}</Spotlight.Empty>
          )}

          {pages.length > 0 && (
            <Spotlight.ActionsGroup label={t("Pages")}>
              {pages}
            </Spotlight.ActionsGroup>
          )}
        </Spotlight.ActionsList>
      </Spotlight.Root>
    </>
  );
}
