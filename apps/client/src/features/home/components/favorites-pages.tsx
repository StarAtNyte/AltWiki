import { useTranslation } from "react-i18next";
import { IconStar } from "@tabler/icons-react";
import { useFavoritesQuery } from "@/features/favorite/queries/favorite-query";
import { GlassPageList } from "@/components/common/recent-changes.tsx";

interface Props {
  spaceId?: string;
  limit?: number;
}

export default function FavoritesPages({ spaceId, limit }: Props) {
  const { t } = useTranslation();
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useFavoritesQuery("page", spaceId);

  const favorites = (data?.pages.flatMap((p) => p.items) ?? []).filter(
    (fav) => fav.page,
  );

  return (
    <GlassPageList
      items={favorites.map((fav) => ({
        key: fav.id,
        slugId: fav.page.slugId,
        title: fav.page.title,
        icon: fav.page.icon,
        isBase: fav.page.isBase,
        space: fav.space,
        date: fav.createdAt,
      }))}
      isLoading={isLoading}
      isError={isError}
      errorText={t("Failed to fetch starred pages")}
      showSpace={!spaceId}
      limit={limit}
      emptyIcon={IconStar}
      emptyTitle={t("No favorites yet")}
      emptyHint={t("Pages you star will show up here.")}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={() => fetchNextPage()}
    />
  );
}
