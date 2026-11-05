import { useTranslation } from "react-i18next";
import { useCreatedByQuery } from "@/features/page/queries/page-query";
import { GlassPageList } from "@/components/common/recent-changes.tsx";

type Props = {
  spaceId?: string;
  limit?: number;
};

export default function CreatedByMe({ spaceId, limit }: Props) {
  const { t } = useTranslation();
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useCreatedByQuery({ spaceId });

  const pages = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <GlassPageList
      items={pages.map((page) => ({
        key: page.id,
        slugId: page.slugId,
        title: page.title,
        icon: page.icon,
        isBase: page.isBase,
        space: page.space,
        date: page.createdAt,
      }))}
      isLoading={isLoading}
      isError={isError}
      errorText={t("Failed to fetch pages")}
      showSpace={!spaceId}
      limit={limit}
      emptyHint={t("Pages you create will show up here.")}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={() => fetchNextPage()}
    />
  );
}
