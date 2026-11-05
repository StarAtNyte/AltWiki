import { useState } from "react";
import { Modal } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useAtom } from "jotai";
import clsx from "clsx";
import RecentChanges from "@/components/common/recent-changes.tsx";
import FavoritesPages from "./favorites-pages";
import CreatedByMe from "./created-by-me";
import { homeTabAtom } from "@/features/home/atoms/home-tab-atom";
import classes from "./home.module.css";

type HomeTab = "recent" | "favorites" | "created";

const TABS: { value: HomeTab; label: string }[] = [
  { value: "recent", label: "Recent edits" },
  { value: "favorites", label: "Favorites" },
  { value: "created", label: "Created by me" },
];

/** Segmented tab switch in a glass panel header. */
export function PanelTabs({
  value,
  onChange,
  label,
}: {
  value: HomeTab;
  onChange: (value: HomeTab) => void;
  label: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={classes.tabs} role="tablist" aria-label={label}>
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          className={classes.tab}
          data-active={value === tab.value || undefined}
          onClick={() => onChange(tab.value)}
        >
          {t(tab.label)}
        </button>
      ))}
    </div>
  );
}

export function PageListPanel({
  tab,
  spaceId,
  limit,
  emptyHint,
}: {
  tab: HomeTab;
  spaceId?: string;
  limit?: number;
  emptyHint?: string;
}) {
  if (tab === "favorites") {
    return <FavoritesPages spaceId={spaceId} limit={limit} />;
  }
  if (tab === "created") {
    return <CreatedByMe spaceId={spaceId} limit={limit} />;
  }
  return <RecentChanges spaceId={spaceId} limit={limit} emptyHint={emptyHint} />;
}

export function normalizeHomeTab(value: string): HomeTab {
  return value === "favorites" || value === "created" ? value : "recent";
}

// Recent edits / favorites / created by me across the user's spaces.
export default function HomeTabs() {
  const { t } = useTranslation();
  const [storedTab, setActiveTab] = useAtom(homeTabAtom);
  const activeTab = normalizeHomeTab(storedTab);
  const [allOpened, setAllOpened] = useState(false);
  const activeLabel = TABS.find((tab) => tab.value === activeTab)?.label;
  const emptyHint = t("Edits across your spaces will appear here.");

  return (
    <section className={clsx(classes.glass, classes.recent)}>
      <div className={clsx(classes.panelHead, classes.recentHead)}>
        <PanelTabs
          value={activeTab}
          onChange={setActiveTab}
          label={t("Pages")}
        />
        <button
          type="button"
          className={classes.link}
          onClick={() => setAllOpened(true)}
        >
          {t("View all")}
          <IconArrowRight size={14} stroke={1.75} />
        </button>
      </div>
      <div className={classes.recentBody}>
        <PageListPanel tab={activeTab} limit={9} emptyHint={emptyHint} />
      </div>

      <Modal
        opened={allOpened}
        onClose={() => setAllOpened(false)}
        title={t(activeLabel ?? "Recent edits")}
        size={720}
      >
        <PageListPanel tab={activeTab} emptyHint={emptyHint} />
      </Modal>
    </section>
  );
}
