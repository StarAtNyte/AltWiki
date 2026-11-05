import { Button, Modal, Text, Group, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { FileButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { ConfluenceIcon } from "@/components/icons/confluence-icon";
import { importConfluenceSpace } from "@/features/space/services/space-service";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getSpaceUrl } from "@/lib/config";
import { formatBytes } from "@/lib";
import { getFileImportSizeLimit } from "@/lib/config";

export default function ImportConfluenceSpaceModal() {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleFileSelect = async (file: File | null) => {
    if (!file) return;

    setIsUploading(true);
    close();

    const notificationId = notifications.show({
      title: t("Importing Confluence space"),
      message: t("Please wait while we import your Confluence space..."),
      loading: true,
      autoClose: false,
      withCloseButton: false,
    });

    try {
      const result = await importConfluenceSpace(file);

      notifications.update({
        id: notificationId,
        color: "teal",
        title: t("Import complete"),
        message: t('Successfully imported "{{spaceName}}" with {{pageCount}} pages.', {
          spaceName: result.spaceName,
          pageCount: result.pageCount,
        }),
        icon: <IconCheck size={18} />,
        loading: false,
        autoClose: 5000,
        withCloseButton: true,
      });

      // Refresh spaces list
      await queryClient.invalidateQueries({ queryKey: ["spaces"] });

      // Navigate to the new space
      // We need to get the space slug from the API response
      const spaceData = await queryClient.fetchQuery({
        queryKey: ["space", result.spaceId],
        queryFn: async () => {
          const response = await fetch(`/api/spaces/info`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ spaceId: result.spaceId }),
          });
          return response.json();
        },
      });

      if (spaceData?.slug) {
        navigate(getSpaceUrl(spaceData.slug));
      }
    } catch (err: any) {
      console.error("Failed to import Confluence space", err);
      notifications.update({
        id: notificationId,
        color: "red",
        title: t("Import failed"),
        message: err?.response?.data?.message || t("Failed to import Confluence space"),
        icon: <IconX size={18} />,
        loading: false,
        autoClose: false,
        withCloseButton: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Button
        variant="default"
        onClick={open}
        leftSection={<ConfluenceIcon size={16} />}
      >
        {t("Import Confluence")}
      </Button>

      <Modal
        opened={opened}
        onClose={close}
        title={t("Import Confluence Space")}
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t(
              "Upload a Confluence space export ZIP file. This will create a new space with all pages from the Confluence export."
            )}
          </Text>

          <Text size="xs" c="dimmed">
            {t("Maximum file size: {{size}}", {
              size: formatBytes(getFileImportSizeLimit()),
            })}
          </Text>

          <Group justify="center" py="md">
            <FileButton
              onChange={handleFileSelect}
              accept="application/zip,.zip"
              disabled={isUploading}
            >
              {(props) => (
                <Button
                  {...props}
                  leftSection={<ConfluenceIcon size={18} />}
                  loading={isUploading}
                >
                  {t("Select ZIP file")}
                </Button>
              )}
            </FileButton>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
