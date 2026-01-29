import { Button, Group, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { modals } from "@mantine/modals";
import {
  useBulkDeletePagesMutation,
  useBulkDuplicatePagesMutation,
} from "@/features/page/queries/page-query";
import { useState } from "react";
import BulkMoveModal from "../../components/bulk-move-modal";

interface BulkActionsBarProps {
  selectedIds: string[];
  spaceId: string;
  spaceSlug: string;
  onClearSelection: () => void;
}

export default function BulkActionsBar({
  selectedIds,
  spaceId,
  spaceSlug,
  onClearSelection,
}: BulkActionsBarProps) {
  const { t } = useTranslation();
  const bulkDeleteMutation = useBulkDeletePagesMutation();
  const bulkDuplicateMutation = useBulkDuplicatePagesMutation();
  const [moveModalOpened, setMoveModalOpened] = useState(false);
  const hasSelection = selectedIds.length > 0;

  const handleBulkDelete = () => {
    modals.openConfirmModal({
      title: t("Delete selected pages"),
      children: (
        <Text size="sm">
          {t(
            "Are you sure you want to move {{count}} pages to trash?",
            { count: selectedIds.length },
          )}
        </Text>
      ),
      centered: true,
      labels: { confirm: t("Delete"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        await bulkDeleteMutation.mutateAsync({
          pageIds: selectedIds,
          permanentlyDelete: false,
          spaceId,
        });
        onClearSelection();
      },
    });
  };

  const handleBulkDuplicate = async () => {
    await bulkDuplicateMutation.mutateAsync({
      pageIds: selectedIds,
      spaceId,
    });
    onClearSelection();
  };

  const handleMoveComplete = () => {
    setMoveModalOpened(false);
    onClearSelection();
  };

  return (
    <>
      <Group
        justify="space-between"
        wrap="nowrap"
        pb={6}
        mb={6}
        style={{
          borderBottom: "1px solid var(--mantine-color-default-border)",
          paddingLeft: "calc(var(--mantine-spacing-md) + 2px)",
          paddingRight: "var(--mantine-spacing-md)",
          marginTop: "-2px",
        }}
      >
        <Text size="xs" fw={500} c={hasSelection ? undefined : "dimmed"} style={{ whiteSpace: "nowrap" }}>
          {hasSelection ? `${selectedIds.length} selected` : "Bulk actions"}
        </Text>
        <Group gap="xs" wrap="nowrap">
          <Button
            size="compact-xs"
            variant="subtle"
            color="gray"
            disabled={!hasSelection}
            onClick={() => setMoveModalOpened(true)}
          >
            {t("Move")}
          </Button>
          <Button
            size="compact-xs"
            variant="subtle"
            color="gray"
            disabled={!hasSelection}
            onClick={handleBulkDuplicate}
            loading={bulkDuplicateMutation.isPending}
          >
            {t("Duplicate")}
          </Button>
          <Button
            size="compact-xs"
            variant="subtle"
            color="red"
            disabled={!hasSelection}
            onClick={handleBulkDelete}
            loading={bulkDeleteMutation.isPending}
          >
            {t("Delete")}
          </Button>
          {hasSelection && (
            <Button
              size="compact-xs"
              variant="subtle"
              color="gray"
              onClick={onClearSelection}
            >
              <IconX size={14} />
            </Button>
          )}
        </Group>
      </Group>

      <BulkMoveModal
        opened={moveModalOpened}
        onClose={() => setMoveModalOpened(false)}
        pageIds={selectedIds}
        currentSpaceSlug={spaceSlug}
        onMoveComplete={handleMoveComplete}
      />
    </>
  );
}
