import RecentChanges from "@/components/common/recent-changes.tsx";
import { useParams } from "react-router-dom";
import { useGetSpaceBySlugQuery } from "@/features/space/queries/space-query.ts";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { IconHistory } from "@tabler/icons-react";
import classes from "@/features/home/components/home.module.css";

export default function SpaceHomeTabs() {
  const { t } = useTranslation();
  const { spaceSlug } = useParams();
  const { data: space } = useGetSpaceBySlugQuery(spaceSlug);

  return (
    <section className={clsx(classes.glass, classes.recent)}>
      <div className={clsx(classes.panelHead, classes.recentHead)}>
        <h2 className={classes.panelTitle}>
          <IconHistory size={18} stroke={1.6} className={classes.panelIcon} />
          {t("Recently updated")}
        </h2>
      </div>
      <div className={classes.recentBody}>
        {space?.id && (
          <RecentChanges
            spaceId={space.id}
            emptyHint={t("Create the first page to get this space started.")}
          />
        )}
      </div>
    </section>
  );
}
