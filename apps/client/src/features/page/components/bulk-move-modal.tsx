import { Modal, Button, Group, Text } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ISpace } from "@/features/space/types/space.types.ts";
import { SpaceSelect } from "@/features/space/components/sidebar/space-select.tsx";
import { useBulkMovePagesMutation } from "@/features/page/queries/page-query";

interface BulkMoveModalProps {
  pageIds: string[];
  currentSpaceSlug: string;
  opened: boolean;
  onClose: () => void;
  onMoveComplete?: () => void;
}

export default function BulkMoveModal({
  pageIds,
  currentSpaceSlug,
  opened,
  onClose,
  onMoveComplete,
}: BulkMoveModalProps) {
  const { t } = useTranslation();
  const [targetSpace, setTargetSpace] = useState<ISpace | null>(null);
  const bulkMoveMutation = useBulkMovePagesMutation();

  const handleBulkMove = async () => {
    if (!targetSpace) return;

    await bulkMoveMutation.mutateAsync({
      pageIds,
      spaceId: targetSpace.id,
    });

    onClose();
    setTargetSpace(null);
    onMoveComplete?.();
  };

  const handleChange = (space: ISpace) => {
    setTargetSpace(space);
  };

  return (
    <Modal.Root
      opened={opened}
      onClose={onClose}
      size={500}
      padding="xl"
      yOffset="10vh"
      xOffset={0}
      mah={400}
      onClick={(e) => e.stopPropagation()}
    >
      <Modal.Overlay />
      <Modal.Content style={{ overflow: "hidden" }}>
        <Modal.Header py={0}>
          <Modal.Title fw={500}>
            {t("Move {{count}} pages", { count: pageIds.length })}
          </Modal.Title>
          <Modal.CloseButton />
        </Modal.Header>
        <Modal.Body>
          <Text mb="xs" c="dimmed" size="sm">
            {t("Move selected pages to a different space.")}
          </Text>

          <SpaceSelect
            value={currentSpaceSlug}
            clearable={false}
            onChange={handleChange}
          />
          <Group justify="end" mt="md">
            <Button onClick={onClose} variant="default">
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleBulkMove}
              loading={bulkMoveMutation.isPending}
              disabled={!targetSpace}
            >
              {t("Move")}
            </Button>
          </Group>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
