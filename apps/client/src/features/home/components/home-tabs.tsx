import { useState } from "react";
import { Modal } from "@mantine/core";
import { IconArrowRight, IconHistory } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import RecentChanges from "@/components/common/recent-changes.tsx";
import classes from "./home.module.css";

// "Recent edits": the latest changes across the user's spaces.
export default function HomeTabs() {
  const { t } = useTranslation();
  const [allOpened, setAllOpened] = useState(false);

  return (
    <section className={clsx(classes.glass, classes.recent)}>
      <div className={clsx(classes.panelHead, classes.recentHead)}>
        <h2 className={classes.panelTitle}>
          <IconHistory size={18} stroke={1.6} className={classes.panelIcon} />
          {t("Recent edits")}
        </h2>
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
        <RecentChanges
          limit={9}
          emptyHint={t("Edits across your spaces will appear here.")}
        />
      </div>

      <Modal
        opened={allOpened}
        onClose={() => setAllOpened(false)}
        title={t("Recent edits")}
        size={720}
      >
        <RecentChanges
          emptyHint={t("Edits across your spaces will appear here.")}
        />
      </Modal>
    </section>
  );
}
