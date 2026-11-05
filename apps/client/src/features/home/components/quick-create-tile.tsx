import { useMemo, useState } from "react";
import { Button, Select, Skeleton } from "@mantine/core";
import { IconPlus, IconSelector } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { useGetSpacesQuery } from "@/features/space/queries/space-query.ts";
import {
  useCreatePageMutation,
  useRecentChangesQuery,
} from "@/features/page/queries/page-query.ts";
import { partitionArchivedSpaces } from "@/features/space/utils/archived-space.ts";
import { ISpace } from "@/features/space/types/space.types.ts";
import { buildPageUrl } from "@/features/page/page.utils.ts";
import { SpaceAvatar } from "@/components/ui/space-avatar.tsx";
import classes from "./home.module.css";

export default function QuickCreateTile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Same key as the rail (space-rail.tsx): one shared request.
  const { data, isLoading } = useGetSpacesQuery({ page: 1, limit: 100 });
  const { data: recent } = useRecentChangesQuery();
  const createPage = useCreatePageMutation();
  const [picked, setPicked] = useState<string | null>(null);

  const spaces = useMemo(() => {
    const { active } = partitionArchivedSpaces<ISpace>(data?.items);
    return active.filter((s) => s.isMember !== false);
  }, [data]);

  // Default to the space of the most recent edit, else the first space.
  const fallbackId = useMemo(() => {
    const recentSpaceId = recent?.items?.[0]?.spaceId;
    if (recentSpaceId && spaces.some((s) => s.id === recentSpaceId)) {
      return recentSpaceId;
    }
    return spaces[0]?.id ?? null;
  }, [recent, spaces]);

  const spaceId = picked ?? fallbackId;
  const space = spaces.find((s) => s.id === spaceId);

  const handleCreate = async () => {
    if (!space) return;
    try {
      const page = await createPage.mutateAsync({ spaceId: space.id });
      navigate(buildPageUrl(space.slug, page.slugId, page.title));
    } catch {
      // error toast is shown by the mutation
    }
  };

  return (
    <section className={clsx(classes.glass, classes.sidePanel, classes.create)}>
      <div className={classes.panelHead}>
        <h2 className={classes.panelTitle}>
          <IconPlus size={18} stroke={1.6} className={classes.panelIcon} />
          {t("New page")}
        </h2>
      </div>
      <div>
        {isLoading ? (
          <Skeleton height={40} radius={10} />
        ) : (
          <Select
            size="sm"
            classNames={{ input: classes.selectInput }}
            rightSection={<IconSelector size={16} stroke={1.6} />}
            rightSectionPointerEvents="none"
            aria-label={t("Space")}
            placeholder={t("Choose a space")}
            data={spaces.map((s) => ({ value: s.id, label: s.name }))}
            value={spaceId}
            onChange={setPicked}
            searchable
            allowDeselect={false}
            nothingFoundMessage={t("No spaces found")}
            comboboxProps={{ withinPortal: true }}
            leftSection={
              space ? (
                <SpaceAvatar name={space.name} logo={space.logo} size={20} radius={5} />
              ) : null
            }
          />
        )}
        <Button
          fullWidth
          className={classes.createButton}
          leftSection={<IconPlus size={16} stroke={1.75} />}
          onClick={handleCreate}
          loading={createPage.isPending}
          disabled={!space}
        >
          {t("Create")}
        </Button>
      </div>
    </section>
  );
}
