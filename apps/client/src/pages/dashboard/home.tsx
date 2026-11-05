import HomeTabs from "@/features/home/components/home-tabs";
import ContinueReadingTile from "@/features/home/components/continue-reading-tile.tsx";
import QuickCreateTile from "@/features/home/components/quick-create-tile.tsx";
import SpaceGrid from "@/features/space/components/space-grid.tsx";
import { BackgroundPickerButton } from "@/features/background/components/background-picker.tsx";
import { getAppName } from "@/lib/config.ts";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useAtom } from "jotai";
import {
  userAtom,
  workspaceAtom,
} from "@/features/user/atoms/current-user-atom.ts";
import classes from "@/features/home/components/home.module.css";
import { useMemo } from "react";

function greetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning, {{name}}";
  if (hour < 18) return "Good afternoon, {{name}}";
  return "Good evening, {{name}}";
}

/** "Thursday, 5 November" in the UI language. */
function todayLabel(locale: string): string {
  const now = new Date();
  try {
    const fmt = (opts: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, opts).format(now);
    return `${fmt({ weekday: "long" })}, ${fmt({ day: "numeric" })} ${fmt({ month: "long" })}`;
  } catch {
    return now.toDateString();
  }
}

export default function Home() {
  const { t, i18n } = useTranslation();
  const [user] = useAtom(userAtom);
  const [workspace] = useAtom(workspaceAtom);
  const firstName = user?.name?.split(" ")[0] ?? "";
  const workspaceName = workspace?.name ?? getAppName();
  // Computed once per visit (and per language), not on every re-render.
  const lang = i18n.language || "en-GB";
  const greeting = useMemo(() => greetingKey(), []);
  const today = useMemo(() => todayLabel(lang), [lang]);

  return (
    <>
      <Helmet>
        <title>
          {t("Home")} - {getAppName()}
        </title>
      </Helmet>
      <div className={classes.frame}>
        <header className={classes.greeting}>
          <div>
            <h1 className={classes.greetingTitle}>
              {t(greeting, { name: firstName })}
            </h1>
            <div className={classes.greetingSub}>
              {workspaceName}
              <span className={classes.greetingDot} aria-hidden>
                ·
              </span>
              {today}
            </div>
          </div>
          <div className={classes.greetingAction}>
            <BackgroundPickerButton />
          </div>
        </header>

        <div className={classes.row}>
          <div className={classes.colMain}>
            <HomeTabs />
          </div>
          <div className={classes.colSide}>
            <ContinueReadingTile />
            <QuickCreateTile />
          </div>
        </div>

        <SpaceGrid />
      </div>
    </>
  );
}
