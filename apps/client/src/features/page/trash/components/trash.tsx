import { useParams } from "react-router-dom";
import { useGetSpaceBySlugQuery } from "@/features/space/queries/space-query";
import {
  Container,
  Title,
  Table,
  Group,
  ActionIcon,
  Text,
  Stack,
  Menu,
  Checkbox,
  Button,
  Box,
} from "@mantine/core";
import {
  IconDots,
  IconRestore,
  IconTrash,
} from "@tabler/icons-react";
import { TrashBanner } from "@/features/page/trash/components/trash-banner.tsx";
import {
  useDeletedPagesQuery,
  useRestorePageMutation,
  useDeletePageMutation,
  useBulkDeletePagesMutation,
  useBulkRestorePagesMutation,
} from "@/features/page/queries/page-query";
import { modals } from "@mantine/modals";
import { useTranslation } from "react-i18next";
import { formattedDate } from "@/lib/time";
import { useState, useCallback, useMemo } from "react";
import TrashPageContentModal from "@/features/page/trash/components/trash-page-content-modal";
import { UserInfo } from "@/components/common/user-info.tsx";
import Paginate from "@/components/common/paginate.tsx";
import { useCursorPaginate } from "@/hooks/use-cursor-paginate";
import { useRestorePageModal } from "@/features/page/hooks/use-restore-page-modal.tsx";
import { PageListIcon } from "@/components/common/page-list-icon";

export default function Trash() {
  const { t } = useTranslation();
  const { spaceSlug } = useParams();
  const { cursor, goNext, goPrev } = useCursorPaginate();
  const { data: space } = useGetSpaceBySlugQuery(spaceSlug);
  const { data: deletedPages, isLoading } = useDeletedPagesQuery(space?.id, {
    cursor, limit: 50
  });
  const restorePageMutation = useRestorePageMutation();
  const deletePageMutation = useDeletePageMutation();
  const { openRestoreModal } = useRestorePageModal();
  const bulkDeleteMutation = useBulkDeletePagesMutation();
  const bulkRestoreMutation = useBulkRestorePagesMutation();

  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedPage, setSelectedPage] = useState<{
    title: string;
    content: any;
    isBase?: boolean;
  } | null>(null);
  const [modalOpened, setModalOpened] = useState(false);

  const pageIds = useMemo(
    () => deletedPages?.items.map((p) => p.id) ?? [],
    [deletedPages],
  );

  const allSelected =
    pageIds.length > 0 && selectedPageIds.size === pageIds.length;
  const someSelected = selectedPageIds.size > 0 && !allSelected;

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedPageIds(new Set());
    } else {
      setSelectedPageIds(new Set(pageIds));
    }
  }, [allSelected, pageIds]);

  const toggleSelectPage = useCallback((pageId: string) => {
    setSelectedPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPageIds(new Set());
  }, []);

  const handleRestorePage = async (pageId: string) => {
    await restorePageMutation.mutateAsync(pageId);
  };

  const handleDeletePage = async (pageId: string) => {
    await deletePageMutation.mutateAsync(pageId);
  };

  const handleBulkRestore = async () => {
    const ids = Array.from(selectedPageIds);
    await bulkRestoreMutation.mutateAsync({
      pageIds: ids,
      spaceId: space?.id,
    });
    clearSelection();
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedPageIds);
    await bulkDeleteMutation.mutateAsync({
      pageIds: ids,
      permanentlyDelete: true,
      spaceId: space?.id,
    });
    clearSelection();
  };

  const openDeleteModal = (pageId: string, pageTitle: string) => {
    modals.openConfirmModal({
      title: t("Are you sure you want to delete this page?"),
      children: (
        <Text size="sm">
          {t(
            "Are you sure you want to permanently delete '{{title}}'? This action cannot be undone.",
            { title: pageTitle || "Untitled" },
          )}
        </Text>
      ),
      centered: true,
      labels: { confirm: t("Delete"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => handleDeletePage(pageId),
    });
  };

  const openBulkDeleteModal = () => {
    modals.openConfirmModal({
      title: t("Delete selected pages"),
      children: (
        <Text size="sm">
          {t(
            "Are you sure you want to permanently delete {{count}} pages? This action cannot be undone.",
            { count: selectedPageIds.size },
          )}
        </Text>
      ),
      centered: true,
      labels: { confirm: t("Delete"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: handleBulkDelete,
    });
  };

  const openBulkRestoreModal = () => {
    modals.openConfirmModal({
      title: t("Restore selected pages"),
      children: (
        <Text size="sm">
          {t("Restore {{count}} pages and their sub-pages?", {
            count: selectedPageIds.size,
          })}
        </Text>
      ),
      centered: true,
      labels: { confirm: t("Restore"), cancel: t("Cancel") },
      confirmProps: { color: "blue" },
      onConfirm: handleBulkRestore,
    });
  };

  const hasPages = deletedPages && deletedPages.items.length > 0;

  const handlePageClick = (page: any) => {
    setSelectedPage({
      title: page.title,
      content: page.content,
      isBase: page.isBase,
    });
    setModalOpened(true);
  };

  return (
    <Container size="lg" py="lg">
      <Stack gap="md">
        <Group justify="space-between" mb="md">
          <Title order={2}>{t("Trash")}</Title>
        </Group>

        <TrashBanner />

        {selectedPageIds.size > 0 && (
          <Box
            p="sm"
            style={{
              backgroundColor: "var(--mantine-color-blue-light)",
              borderRadius: "var(--mantine-radius-sm)",
            }}
          >
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                {t("{{count}} pages selected", { count: selectedPageIds.size })}
              </Text>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="light"
                  color="blue"
                  leftSection={<IconRestore size={14} />}
                  onClick={openBulkRestoreModal}
                  loading={bulkRestoreMutation.isPending}
                >
                  {t("Restore")}
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={openBulkDeleteModal}
                  loading={bulkDeleteMutation.isPending}
                >
                  {t("Delete")}
                </Button>
                <Button size="xs" variant="subtle" onClick={clearSelection}>
                  {t("Cancel")}
                </Button>
              </Group>
            </Group>
          </Box>
        )}

        {isLoading || !deletedPages ? (
          <></>
        ) : hasPages ? (
          <Table.ScrollContainer minWidth={500}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 40 }}>
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleSelectAll}
                      aria-label={t("Select all")}
                    />
                  </Table.Th>
                  <Table.Th>{t("Page")}</Table.Th>
                  <Table.Th style={{ whiteSpace: "nowrap" }}>
                    {t("Deleted by")}
                  </Table.Th>
                  <Table.Th style={{ whiteSpace: "nowrap" }}>
                    {t("Deleted at")}
                  </Table.Th>
                  <Table.Th aria-label={t("Action")} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {deletedPages.items.map((page) => (
                  <Table.Tr
                    key={page.id}
                    bg={
                      selectedPageIds.has(page.id)
                        ? "var(--mantine-color-blue-light)"
                        : undefined
                    }
                  >
                    <Table.Td>
                      <Checkbox
                        checked={selectedPageIds.has(page.id)}
                        onChange={() => toggleSelectPage(page.id)}
                        aria-label={t("Select page")}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Group
                        wrap="nowrap"
                        style={{ cursor: "pointer" }}
                        onClick={() => handlePageClick(page)}
                      >
                        <PageListIcon icon={page.icon} isBase={page.isBase} />
                        <div>
                          <Text fw={500} size="sm" lineClamp={1}>
                            {page.title || t("Untitled")}
                          </Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <UserInfo user={page.deletedBy} size="sm" />
                    </Table.Td>
                    <Table.Td>
                      <Text
                        c="dimmed"
                        style={{ whiteSpace: "nowrap" }}
                        size="xs"
                        fw={500}
                      >
                        {formattedDate(page.deletedAt)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Menu>
                        <Menu.Target>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label={t("Page actions")}
                          >
                            <IconDots size={20} stroke={1.5} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconRestore size={16} />}
                            onClick={() =>
                              openRestoreModal({
                                title: page.title,
                                onConfirm: () => handleRestorePage(page.id),
                              })
                            }
                          >
                            {t("Restore")}
                          </Menu.Item>
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={16} />}
                            onClick={() => openDeleteModal(page.id, page.title)}
                          >
                            {t("Delete")}
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <Text ta="center" py="xl" c="dimmed">
            {t("No pages in trash")}
          </Text>
        )}

        {deletedPages && deletedPages.items.length > 0 && (
          <Paginate
            hasPrevPage={deletedPages.meta?.hasPrevPage}
            hasNextPage={deletedPages.meta?.hasNextPage}
            onNext={() => goNext(deletedPages.meta?.nextCursor)}
            onPrev={goPrev}
          />
        )}
      </Stack>

      {selectedPage && (
        <TrashPageContentModal
          opened={modalOpened}
          onClose={() => setModalOpened(false)}
          pageTitle={selectedPage.title}
          pageContent={selectedPage.content}
          isBase={selectedPage.isBase}
        />
      )}
    </Container>
  );
}
