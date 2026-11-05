import { useParams } from "react-router-dom";
import { useGetSpaceBySlugQuery } from "@/features/space/queries/space-query";
import { useTranslation } from "react-i18next";
import { useAtom } from "jotai";
import clsx from "clsx";
import { homeTabAtom } from "@/features/home/atoms/home-tab-atom";
import {
  normalizeHomeTab,
  PageListPanel,
  PanelTabs,
} from "@/features/home/components/home-tabs.tsx";
import classes from "@/features/home/components/home.module.css";

export default function SpaceHomeTabs() {
  const { t } = useTranslation();
  const { spaceSlug } = useParams();
  const { data: space } = useGetSpaceBySlugQuery(spaceSlug);
  const [storedTab, setActiveTab] = useAtom(homeTabAtom);
  const activeTab = normalizeHomeTab(storedTab);

  return (
    <section className={clsx(classes.glass, classes.recent)}>
      <div className={clsx(classes.panelHead, classes.recentHead)}>
        <PanelTabs
          value={activeTab}
          onChange={setActiveTab}
          label={t("Pages")}
        />
      </div>
      <div className={classes.recentBody}>
        {space?.id && (
          <PageListPanel
            tab={activeTab}
            spaceId={space.id}
            emptyHint={t("Create the first page to get this space started.")}
          />
        )}
      </div>
    </section>
  );
}
