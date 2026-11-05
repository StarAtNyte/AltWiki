import { Button } from "@mantine/core";
import { Spotlight } from "@mantine/spotlight";
import { IconFileText, IconLetterCase, IconSearch } from "@tabler/icons-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useDebouncedValue } from "@mantine/hooks";
import { usePublicSpaceSearchQuery } from "@/features/search/queries/search-query";
import { buildPublicSpaceUrl } from "@/features/page/page.utils.ts";
import { useTranslation } from "react-i18next";
import { publicSpaceSearchSpotlightStore } from "@/features/search/constants.ts";
import clsx from "clsx";
import filterClasses from "./search-spotlight-filters.module.css";
import {
  spotlightClassNames,
  spotlightClasses as classes,
} from "./spotlight-classes.ts";
import DOMPurify from "dompurify";

interface PublicSpaceSearchSpotlightProps {
  spaceSlug: string;
}
export function PublicSpaceSearchSpotlight({
  spaceSlug,
}: PublicSpaceSearchSpotlightProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [titleOnly, setTitleOnly] = useState(false);
  const [debouncedSearchQuery] = useDebouncedValue(query, 300);

  const { data: searchResults } = usePublicSpaceSearchQuery({
    query: debouncedSearchQuery,
    spaceSlug,
    ...(titleOnly && { titleOnly: true }),
  });

  const pages = (
    searchResults && searchResults.length > 0 ? searchResults : []
  ).map((page) => (
    <Spotlight.Action
      key={page.id}
      component={Link}
      //@ts-ignore
      to={buildPublicSpaceUrl({
        spaceSlug: spaceSlug,
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
                  ALLOWED_ATTR: [],
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
        store={publicSpaceSearchSpotlightStore}
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
            aria-label={t("Search")}
            leftSection={<IconSearch size={18} stroke={1.5} />}
            leftSectionWidth={44}
          />
        </div>
        <div className={classes.filters}>
          <Button
            variant="subtle"
            color="gray"
            size="sm"
            fw={500}
            className={clsx(
              filterClasses.filterButton,
              titleOnly && filterClasses.filterButtonActive,
            )}
            leftSection={<IconLetterCase size={15} stroke={1.5} />}
            aria-pressed={titleOnly}
            onClick={() => setTitleOnly((value) => !value)}
          >
            {t("Title only")}
          </Button>
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
