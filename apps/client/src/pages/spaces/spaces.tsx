import { Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { getAppName } from "@/lib/config";
import { useGetSpacesQuery } from "@/features/space/queries/space-query";
import CreateSpaceModal from "@/features/space/components/create-space-modal";
import ImportConfluenceSpaceModal from "@/features/space/components/import-confluence-space-modal";
import { AllSpacesList } from "@/features/space/components/spaces-page";
import { usePaginateAndSearch } from "@/hooks/use-paginate-and-search";
import useUserRole from "@/hooks/use-user-role";
import homeClasses from "@/features/home/components/home.module.css";

export default function Spaces() {
  const { t } = useTranslation();
  const { isAdmin } = useUserRole();
  const { search, page, setPage, handleSearch } = usePaginateAndSearch();

  const { data, isLoading } = useGetSpacesQuery({
    page,
    limit: 30,
    query: search,
  });

  return (
    <>
      <Helmet>
        <title>
          {t("Spaces")} - {getAppName()}
        </title>
      </Helmet>

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

        <AllSpacesList
          spaces={data?.items || []}
          isLoading={isLoading}
          onSearch={handleSearch}
          page={page}
          hasPrevPage={data?.meta?.hasPrevPage}
          hasNextPage={data?.meta?.hasNextPage}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
