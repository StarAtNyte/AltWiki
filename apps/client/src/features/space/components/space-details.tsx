import React from "react";
import { useSpaceQuery } from "@/features/space/queries/space-query.ts";
import { EditSpaceForm } from "@/features/space/components/edit-space-form.tsx";
import { Button, Divider, Group, Text } from "@mantine/core";
import DeleteSpaceModal from "./delete-space-modal";
import { useDisclosure } from "@mantine/hooks";
import ExportModal from "@/components/common/export-modal.tsx";
import { SpaceAvatar } from "@/components/ui/space-avatar.tsx";
import { SpaceIconPicker } from "@/features/space/icons/space-icon-picker.tsx";
import { IconPhotoEdit } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveSettingsContent,
  ResponsiveSettingsControl,
  ResponsiveSettingsRow,
} from "@/components/ui/responsive-settings-row.tsx";

interface SpaceDetailsProps {
  spaceId: string;
  readOnly?: boolean;
}
export default function SpaceDetails({ spaceId, readOnly }: SpaceDetailsProps) {
  const { t } = useTranslation();
  const { data: space } = useSpaceQuery(spaceId);
  const [exportOpened, { open: openExportModal, close: closeExportModal }] =
    useDisclosure(false);
  const [iconPickerOpened, { open: openIconPicker, close: closeIconPicker }] =
    useDisclosure(false);

  return (
    <>
      {space && (
        <div>
          <Text my="md" fw={600}>
            {t("Details")}
          </Text>

          <div style={{ marginBottom: "20px" }}>
            <Text size="sm" fw={500} mb="xs">
              {t("Icon")}
            </Text>
            <Group gap="md" align="center">
              <SpaceAvatar name={space.name} logo={space.logo} size={60} />
              {!readOnly && (
                <Button
                  variant="default"
                  size="sm"
                  leftSection={<IconPhotoEdit size={16} stroke={1.5} />}
                  onClick={openIconPicker}
                >
                  {t("Change icon")}
                </Button>
              )}
            </Group>
            {!readOnly && (
              <SpaceIconPicker
                opened={iconPickerOpened}
                onClose={closeIconPicker}
                spaceId={space.id}
                spaceName={space.name}
                hasLogo={!!space.logo}
              />
            )}
          </div>

          <EditSpaceForm space={space} readOnly={readOnly} />

          {!readOnly && (
            <>
              <Divider my="lg" />

              <ResponsiveSettingsRow>
                <ResponsiveSettingsContent>
                  <Text size="md">{t("Export space")}</Text>
                  <Text size="sm" c="dimmed">
                    {t("Export all pages and attachments in this space.")}
                  </Text>
                </ResponsiveSettingsContent>
                <ResponsiveSettingsControl>
                  <Button onClick={openExportModal}>{t("Export")}</Button>
                </ResponsiveSettingsControl>
              </ResponsiveSettingsRow>

              <Divider my="lg" />

              <ResponsiveSettingsRow>
                <ResponsiveSettingsContent>
                  <Text size="md">{t("Delete space")}</Text>
                  <Text size="sm" c="dimmed">
                    {t("Delete this space with all its pages and data.")}
                  </Text>
                </ResponsiveSettingsContent>
                <ResponsiveSettingsControl>
                  <DeleteSpaceModal space={space} />
                </ResponsiveSettingsControl>
              </ResponsiveSettingsRow>

              <ExportModal
                type="space"
                id={space.id}
                open={exportOpened}
                onClose={closeExportModal}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}
