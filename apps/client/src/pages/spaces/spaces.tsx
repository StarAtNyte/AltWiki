import { Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useGetSpacesQuery } from "@/features/space/queries/space-query";
import CreateSpaceModal from "@/features/space/components/create-space-modal";
import ImportConfluenceSpaceModal from "@/features/space/components/import-confluence-space-modal";
import { AllSpacesList } from "@/features/space/components/spaces-page";
import FavoriteSpacesGrid from "@/features/space/components/spaces-page/favorite-spaces-grid";
import { usePaginateAndSearch } from "@/hooks/use-paginate-and-search";
import useUserRole from "@/hooks/use-user-role";
import { DocumentTitle } from "@/components/ui/document-title.tsx";
import homeClasses from "@/features/home/components/home.module.css";

export default function Spaces() {
  const { t } = useTranslation();
  const { isAdmin } = useUserRole();
  const { search, cursor, goNext, goPrev, handleSearch } = usePaginateAndSearch();

  const { data, isLoading } = useGetSpacesQuery({
    cursor,
    limit: 30,
    query: search,
  });

  return (
    <>
      <DocumentTitle title={t("Spaces")} />

      <div className={homeClasses.frame}>
        <header className={homeClasses.greeting}>
          <div>
            <h1 className={homeClasses.greetingTitle}>{t("Spaces")}</h1>
            <div className={homeClasses.greetingSub}>
              {t("All spaces in your workspace")}
            </div>
          </div>
          {isAdmin && (
            <Group gap="sm" className={homeClasses.greetingAction}>
              <ImportConfluenceSpaceModal />
              <CreateSpaceModal />
            </Group>
          )}
        </header>

        <FavoriteSpacesGrid />

        <AllSpacesList
          spaces={data?.items || []}
          isLoading={isLoading}
          onSearch={handleSearch}
          hasPrevPage={data?.meta?.hasPrevPage}
          hasNextPage={data?.meta?.hasNextPage}
          onNext={() => goNext(data?.meta?.nextCursor)}
          onPrev={goPrev}
        />
      </div>
    </>
  );
}
