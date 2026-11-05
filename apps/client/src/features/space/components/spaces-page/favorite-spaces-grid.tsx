import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { IconChevronDown, IconStar } from "@tabler/icons-react";
import { useFavoritesQuery } from "@/features/favorite/queries/favorite-query";
import { getSpaceUrl } from "@/lib/config";
import { prefetchSpace } from "@/features/space/queries/space-query";
import StarButton from "@/features/favorite/components/star-button";
import { SpaceAvatar } from "@/components/ui/space-avatar.tsx";
import homeClasses from "@/features/home/components/home.module.css";
import spaceClasses from "../space-grid.module.css";
import classes from "./all-spaces-list.module.css";

const INITIAL_COUNT = 8;

/** Starred spaces, in the glass card style of the home Spaces panel. */
export default function FavoriteSpacesGrid() {
  const { t } = useTranslation();
  const { data } = useFavoritesQuery("space");
  const [expanded, setExpanded] = useState(false);

  const allSpaces = (data?.pages.flatMap((p) => p.items) ?? [])
    .filter((fav) => fav.space)
    .sort((a, b) => a.space!.name.localeCompare(b.space!.name));

  if (allSpaces.length === 0) return null;

  const visibleSpaces = expanded
    ? allSpaces
    : allSpaces.slice(0, INITIAL_COUNT);

  return (
    <section className={clsx(homeClasses.glass, classes.panel, classes.favorites)}>
      <div className={classes.panelHead}>
        <h2 className={homeClasses.panelTitle}>
          <IconStar size={18} stroke={1.6} className={homeClasses.panelIcon} />
          {t("Favorite spaces")}
          <span className={homeClasses.count}>{allSpaces.length}</span>
        </h2>
        {!expanded && allSpaces.length > INITIAL_COUNT && (
          <button
            type="button"
            className={homeClasses.link}
            onClick={() => setExpanded(true)}
          >
            {t("Show more")}
            <IconChevronDown size={14} stroke={1.75} />
          </button>
        )}
      </div>

      <div className={spaceClasses.grid}>
        {visibleSpaces.map((fav) => (
          <Link
            key={fav.id}
            to={getSpaceUrl(fav.space!.slug)}
            onMouseEnter={() => prefetchSpace(fav.space!.slug, fav.space!.id)}
            className={spaceClasses.card}
          >
            <span className={spaceClasses.cardTop}>
              <SpaceAvatar
                name={fav.space!.name}
                logo={fav.space!.logo}
                size={32}
                radius={8}
              />
              <StarButton
                type="space"
                spaceId={fav.space!.id}
                name={fav.space!.name}
                size={15}
              />
            </span>
            <span className={spaceClasses.body}>
              <span className={spaceClasses.title}>{fav.space!.name}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
