import clsx from "clsx";
import styles from "./docs.module.css";

export default function DocsFooterBranding({
  className,
}: {
  className?: string;
  // Kept for call-site compatibility; AltWiki branding has no referral link.
  refSource?: string;
}) {
  return (
    <footer className={clsx(styles.footer, className)}>
      <a className={styles.footerBranding} href="#">
        Powered by AltWiki
      </a>
    </footer>
  );
}
