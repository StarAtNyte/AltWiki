import { useState } from "react";
import { Button, Container, Skeleton } from "@mantine/core";
import SpaceHomeTabs from "@/features/space/components/space-home-tabs.tsx";
import { useParams } from "react-router-dom";
import { useGetSpaceBySlugQuery } from "@/features/space/queries/space-query.ts";
import { DocumentTitle } from "@/components/ui/document-title.tsx";
import SpacePublicNotice from "@/features/public-space/components/space-public-notice.tsx";
import { CustomAvatar } from "@/components/ui/custom-avatar.tsx";
import { AvatarIconType } from "@/features/attachments/types/attachment.types.ts";
import { formatMemberCount } from "@/lib";
import { useTranslation } from "react-i18next";
import { IconPlus, IconUsers } from "@tabler/icons-react";
import { useSpaceAbility } from "@/features/space/permissions/use-space-ability.ts";
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from "@/features/space/permissions/permissions.type.ts";
import { useTreeMutation } from "@/features/page/tree/hooks/use-tree-mutation.ts";
import clsx from "clsx";
import classes from "@/features/space/components/space-home.module.css";
import homeClasses from "@/features/home/components/home.module.css";

export default function SpaceHome() {
  const { t } = useTranslation();
  const { spaceSlug } = useParams();
  const { data: space, isLoading } = useGetSpaceBySlugQuery(spaceSlug);
  const spaceAbility = useSpaceAbility(space?.membership?.permissions);
  const { handleCreate } = useTreeMutation(space?.id ?? "");
  const [creating, setCreating] = useState(false);

  const canCreate = spaceAbility.can(
    SpaceCaslAction.Manage,
    SpaceCaslSubject.Page,
  );

  const handleNewPage = async () => {
    if (!space || creating) return;
    // Same path as the sidebar's "New page" so the tree stays in sync.
    setCreating(true);
    try {
      await handleCreate(null);
    } catch {
      // error toast is shown by the mutation
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <DocumentTitle title={space?.name || "Overview"} />
      <Container size={960} className={classes.container}>
        {isLoading && !space && (
          <Skeleton height={88} radius={18} mb="lg" />
        )}
        {space && (
          <>
            <header className={clsx(homeClasses.glass, classes.header)}>
              <CustomAvatar
                name={space.name}
                avatarUrl={space.logo}
                type={AvatarIconType.SPACE_ICON}
                size={48}
                radius={10}
              />
              <div className={classes.headerText}>
                <h1 className={classes.title}>{space.name}</h1>
                <div className={classes.meta}>
                  {space.description && (
                    <span className={classes.desc}>{space.description}</span>
                  )}
                  {typeof space.memberCount === "number" && (
                    <span className={classes.members}>
                      <IconUsers size={13} stroke={1.75} />
                      {formatMemberCount(space.memberCount, t)}
                    </span>
                  )}
                </div>
              </div>
              {canCreate && (
                <Button
                  className={clsx(homeClasses.createButton, classes.action)}
                  leftSection={<IconPlus size={15} stroke={2} />}
                  onClick={handleNewPage}
                  loading={creating}
                >
                  {t("New page")}
                </Button>
              )}
            </header>
            <SpacePublicNotice space={space} />
            <SpaceHomeTabs />
          </>
        )}
      </Container>
    </>
  );
}
