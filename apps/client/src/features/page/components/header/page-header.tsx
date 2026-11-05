import classes from "./page-header.module.css";
import PageHeaderMenu from "@/features/page/components/header/page-header-menu.tsx";
import { Group } from "@mantine/core";
import Breadcrumb from "@/features/page/components/breadcrumbs/breadcrumb.tsx";

interface Props {
  readOnly?: boolean;
}
export default function PageHeader({ readOnly }: Props) {
  return (
    <div className={classes.header}>
      <Group justify="space-between" h="100%" wrap="nowrap" gap="md" className={classes.group}>
        <div className={classes.crumbs}>
          <Breadcrumb />
        </div>

        <Group justify="flex-end" h="100%" wrap="nowrap" gap={6} className={classes.actions}>
          <PageHeaderMenu readOnly={readOnly} />
        </Group>
      </Group>
    </div>
  );
}
