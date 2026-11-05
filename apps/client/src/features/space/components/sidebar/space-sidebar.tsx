import {
  ActionIcon,
  Button,
  Group,
  Menu,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconArrowDown,
  IconBrandGithub,
  IconCheck,
  IconChevronDown,
  IconDots,
  IconEye,
  IconEyeOff,
  IconFileExport,
  IconFilePlus,
  IconHome,
  IconLayoutGrid,
  IconListCheck,
  IconPlus,
  IconSelector,
  IconSettings,
  IconStar,
  IconStarFilled,
  IconWorld,
  IconPhotoEdit,
  IconTemplate,
  IconTrash,
} from "@tabler/icons-react";
import classes from "./space-sidebar.module.css";
import React, { useCallback } from "react";
import { useAtom } from "jotai";
import {
  selectedPageIdsAtom,
  selectionModeAtom,
  sortOrderAtom,
  SortOrder,
  treeDataAtom,
} from "@/features/page/tree/atoms/tree-data-atom.ts";
import { useTreeMutation } from "@/features/page/tree/hooks/use-tree-mutation.ts";
import { SpaceTreeNode } from "@/features/page/tree/types";
import {
  useSpaceWatchStatusQuery,
  useWatchSpaceMutation,
  useUnwatchSpaceMutation,
} from "@/features/space/queries/space-watcher-query.ts";
import {
  useFavoriteIds,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} from "@/features/favorite/queries/favorite-query";
import { useHasFeature } from "@/ee/hooks/use-feature";
import { Feature } from "@/ee/features";
import { ErrorBoundary } from "react-error-boundary";
import { Link, useLocation, useParams } from "react-router-dom";
import { useDisclosure } from "@mantine/hooks";
import SpaceSettingsModal from "@/features/space/components/settings-modal.tsx";
import { useGetSpaceBySlugQuery } from "@/features/space/queries/space-query.ts";
import { getSpaceUrl, isBetaPublicSpaces } from "@/lib/config.ts";
import SpaceTree from "@/features/page/tree/components/space-tree.tsx";
import BulkActionsBar from "@/features/page/tree/components/bulk-actions-bar.tsx";
import { useSpaceAbility } from "@/features/space/permissions/use-space-ability.ts";
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from "@/features/space/permissions/permissions.type.ts";
import { useTranslation } from "react-i18next";
import { SpaceAvatar } from "@/components/ui/space-avatar.tsx";
import { SpaceIconPicker } from "@/features/space/icons/space-icon-picker.tsx";
import APP_ROUTE from "@/lib/app-route.ts";
import ExportModal from "@/components/common/export-modal";
import { mobileSidebarAtom } from "@/components/layouts/global/hooks/atoms/sidebar-atom.ts";
import { useToggleSidebar } from "@/components/layouts/global/hooks/hooks/use-toggle-sidebar.ts";
import { useCreateFromTemplate } from "@/features/templates/hooks/use-create-from-template";
import type { DocTemplate } from "@/features/templates/data/templates";
import { lazy, Suspense } from "react";
import { useMountedOnce } from "@/hooks/use-mounted-once.ts";

// Heavy, rarely used modals: fetched the first time they are opened.
const PageImportModal = lazy(
  () => import("@/features/page/components/page-import-modal.tsx"),
);
const GithubDocsModal = lazy(() =>
  import("@/features/github-docs/components/github-docs-modal").then((m) => ({
    default: m.GithubDocsModal,
  })),
);
const TemplatePickerModal = lazy(() =>
  import("@/features/templates/components/template-picker-modal").then(
    (m) => ({ default: m.TemplatePickerModal }),
  ),
);
// Enterprise workspace templates (licensed feature only).
const WorkspaceTemplatePickerModal = lazy(
  () => import("@/ee/template/components/template-picker-modal"),
);

function collectNodeIds(nodes: SpaceTreeNode[], into: Set<string>) {
  for (const node of nodes) {
    into.add(node.id);
    if (node.children?.length) collectNodeIds(node.children, into);
  }
  return into;
}

export function SpaceSidebar() {
  const { t } = useTranslation();
  const [treeData] = useAtom(treeDataAtom);
  const [selectedPageIds, setSelectedPageIds] = useAtom(selectedPageIdsAtom);
  const [selectionMode, setSelectionMode] = useAtom(selectionModeAtom);
  const location = useLocation();
  const [opened, { open: openSettings, close: closeSettings }] =
    useDisclosure(false);
  const [githubDocsOpened, { open: openGithubDocs, close: closeGithubDocs }] =
    useDisclosure(false);
  const [templateOpened, { open: openTemplates, close: closeTemplates }] =
    useDisclosure(false);
  const [
    workspaceTemplatesOpened,
    { open: openWorkspaceTemplates, close: closeWorkspaceTemplates },
  ] = useDisclosure(false);
  const hasWorkspaceTemplates = useHasFeature(Feature.TEMPLATES);
  const githubDocsMounted = useMountedOnce(githubDocsOpened);
  const templateMounted = useMountedOnce(templateOpened);
  const { createFromTemplate } = useCreateFromTemplate();
  const [mobileSidebarOpened] = useAtom(mobileSidebarAtom);
  const toggleMobileSidebar = useToggleSidebar(mobileSidebarAtom);

  const { spaceSlug } = useParams();
  const { data: space } = useGetSpaceBySlugQuery(spaceSlug);

  const spaceRules = space?.membership?.permissions;
  const spaceAbility = useSpaceAbility(spaceRules);
  const { handleCreate } = useTreeMutation(space?.id ?? "");

  const clearSelection = useCallback(() => {
    setSelectedPageIds(new Set());
    setSelectionMode(false);
  }, [setSelectedPageIds, setSelectionMode]);

  const enableSelectionMode = useCallback(() => {
    setSelectionMode(true);
  }, [setSelectionMode]);

  const selectAllVisiblePages = useCallback(() => {
    // Every page loaded into the tree (expanded branches included).
    setSelectedPageIds(collectNodeIds(treeData, new Set<string>()));
  }, [treeData, setSelectedPageIds]);

  if (!space) {
    return <></>;
  }

  function handleCreatePage() {
    handleCreate(null);
  }

  const canManagePages = spaceAbility.can(
    SpaceCaslAction.Manage,
    SpaceCaslSubject.Page,
  );

  const canManageSettings = spaceAbility.can(
    SpaceCaslAction.Manage,
    SpaceCaslSubject.Settings,
  );

  const closeMobileIfOpen = () => {
    if (mobileSidebarOpened) {
      toggleMobileSidebar();
    }
  };

  const isOverview =
    location.pathname.toLowerCase() === getSpaceUrl(spaceSlug).toLowerCase();

  return (
    <>
      <div className={classes.navbar}>
        <div className={classes.header}>
          <SpaceHeaderMenu
            spaceId={space.id}
            spaceName={space.name}
            spaceLogo={space.logo}
            spaceSlug={space.slug}
            isOverview={isOverview}
            isPublished={isBetaPublicSpaces() && !!space.isPublished}
            canManage={canManagePages}
            canManageSettings={canManageSettings}
            onSpaceSettings={openSettings}
            onNavigate={closeMobileIfOpen}
          />
        </div>

        {canManagePages && (
          <div className={classes.actions}>
            <Menu width="target" position="bottom-start" offset={6}>
              <Menu.Target>
                <Button
                  fullWidth
                  size="sm"
                  variant="default"
                  justify="flex-start"
                  className={classes.newButton}
                  classNames={{ section: classes.newSection, inner: classes.newInner }}
                  leftSection={<IconPlus size={15} stroke={2} />}
                  rightSection={<IconChevronDown size={13} stroke={1.75} />}
                >
                  <span className={classes.newLabel}>{t("New")}</span>
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconFilePlus size={16} />}
                  onClick={() => {
                    handleCreatePage();
                    closeMobileIfOpen();
                  }}
                >
                  {t("Page")}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTemplate size={16} />}
                  onClick={openTemplates}
                >
                  {t("From template")}
                </Menu.Item>
                {hasWorkspaceTemplates && (
                  <Menu.Item
                    leftSection={<IconTemplate size={16} />}
                    onClick={openWorkspaceTemplates}
                  >
                    {t("Workspace template")}
                  </Menu.Item>
                )}
                <Menu.Item
                  leftSection={<IconBrandGithub size={16} />}
                  onClick={openGithubDocs}
                >
                  {t("From GitHub")}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
        )}

        <div className={classes.sectionPages}>
          <Group className={classes.pagesHeader} justify="space-between" wrap="nowrap">
            <Text className={classes.pagesLabel}>{t("Pages")}</Text>

            {canManagePages && (
              <Group gap={2} wrap="nowrap">
                <PagesMenu onSelectPages={enableSelectionMode} />
                <Tooltip label={t("Create page")} withArrow position="right">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size={22}
                    onClick={handleCreatePage}
                    aria-label={t("Create page")}
                  >
                    <IconPlus size={15} stroke={2} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            )}
          </Group>

          {canManagePages && selectionMode && (
            <div className={classes.bulkBar}>
              <BulkActionsBar
                selectedIds={Array.from(selectedPageIds)}
                spaceId={space.id}
                spaceSlug={spaceSlug || ""}
                onClearSelection={clearSelection}
                selectionMode={selectionMode}
                onEnableSelectionMode={enableSelectionMode}
                onSelectAll={selectAllVisiblePages}
              />
            </div>
          )}

          <div className={classes.pages}>
            <SpaceTree
              spaceId={space.id}
              readOnly={!canManagePages}
            />
          </div>
        </div>
      </div>

      <SpaceSettingsModal
        opened={opened}
        onClose={closeSettings}
        spaceId={space?.slug}
      />

      <Suspense fallback={null}>
      {githubDocsMounted && (
      <GithubDocsModal
        opened={githubDocsOpened}
        onClose={closeGithubDocs}
      />
      )}

      {templateMounted && (
      <TemplatePickerModal
        opened={templateOpened}
        onClose={closeTemplates}
        onSelect={(template: DocTemplate) => {
          createFromTemplate({
            template,
            spaceId: space.id,
          });
          if (mobileSidebarOpened) {
            toggleMobileSidebar();
          }
        }}
      />
      )}
      </Suspense>

      {hasWorkspaceTemplates && workspaceTemplatesOpened && (
        <ErrorBoundary fallbackRender={() => null}>
          <Suspense fallback={null}>
            <WorkspaceTemplatePickerModal
              opened={workspaceTemplatesOpened}
              onClose={closeWorkspaceTemplates}
              initialSpaceId={space.id}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  );
}

interface SpaceHeaderMenuProps {
  spaceId: string;
  spaceName: string;
  spaceLogo?: string;
  spaceSlug: string;
  isOverview: boolean;
  isPublished?: boolean;
  canManage: boolean;
  canManageSettings: boolean;
  onSpaceSettings: () => void;
  onNavigate: () => void;
}

function SpaceHeaderMenu({
  spaceId,
  spaceName,
  spaceLogo,
  spaceSlug,
  isOverview,
  isPublished,
  canManage,
  canManageSettings,
  onSpaceSettings,
  onNavigate,
}: SpaceHeaderMenuProps) {
  const { t } = useTranslation();
  const [importOpened, { open: openImportModal, close: closeImportModal }] =
    useDisclosure(false);
  const importMounted = useMountedOnce(importOpened);
  const [exportOpened, { open: openExportModal, close: closeExportModal }] =
    useDisclosure(false);
  const [iconOpened, { open: openIconPicker, close: closeIconPicker }] =
    useDisclosure(false);

  const { data: watchStatus } = useSpaceWatchStatusQuery(spaceId);
  const watchMutation = useWatchSpaceMutation();
  const unwatchMutation = useUnwatchSpaceMutation();
  const isWatching = watchStatus?.watching ?? false;

  const favoriteIds = useFavoriteIds("space");
  const addFavoriteMutation = useAddFavoriteMutation();
  const removeFavoriteMutation = useRemoveFavoriteMutation();
  const isFavorited = favoriteIds.has(spaceId);

  const handleToggleFavorite = () => {
    const params = { type: "space" as const, spaceId };
    if (isFavorited) {
      removeFavoriteMutation.mutate(params);
    } else {
      addFavoriteMutation.mutate(params);
    }
  };

  const handleToggleWatch = () => {
    if (isWatching) {
      unwatchMutation.mutate(spaceId);
    } else {
      watchMutation.mutate(spaceId);
    }
  };

  return (
    <>
      <Menu width={240} position="bottom-start" offset={4}>
        <Menu.Target>
          <UnstyledButton
            className={classes.spaceButton}
            aria-label={t("Space menu")}
          >
            <SpaceAvatar name={spaceName} logo={spaceLogo} size={24} radius={6} />
            <Text className={classes.spaceName} lineClamp={1}>
              {spaceName}
            </Text>
            {isPublished && (
              <Tooltip label={t("This space is public")}>
                <IconWorld
                  size={14}
                  aria-label={t("This space is public")}
                  className={classes.spaceChevron}
                  style={{ flexShrink: 0 }}
                />
              </Tooltip>
            )}
            <IconSelector size={15} className={classes.spaceChevron} />
          </UnstyledButton>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item
            component={Link}
            to={getSpaceUrl(spaceSlug)}
            onClick={onNavigate}
            leftSection={<IconHome size={16} />}
            rightSection={isOverview ? <IconCheck size={14} /> : null}
          >
            {t("Overview")}
          </Menu.Item>
          <Menu.Item
            onClick={handleToggleFavorite}
            leftSection={
              isFavorited ? (
                <IconStarFilled
                  size={16}
                  color="var(--mantine-color-yellow-filled)"
                />
              ) : (
                <IconStar size={16} />
              )
            }
          >
            {isFavorited ? t("Remove from favorites") : t("Add to favorites")}
          </Menu.Item>
          <Menu.Item
            onClick={handleToggleWatch}
            leftSection={
              isWatching ? <IconEyeOff size={16} /> : <IconEye size={16} />
            }
          >
            {isWatching ? t("Stop watching space") : t("Watch space")}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            onClick={onSpaceSettings}
            leftSection={<IconSettings size={16} />}
          >
            {t("Space settings")}
          </Menu.Item>
          {canManageSettings && (
            <Menu.Item
              onClick={openIconPicker}
              leftSection={<IconPhotoEdit size={16} />}
            >
              {t("Change icon")}
            </Menu.Item>
          )}

          {canManage && (
            <>
              <Menu.Divider />
              <Menu.Item
                onClick={openImportModal}
                leftSection={<IconArrowDown size={16} />}
              >
                {t("Import pages")}
              </Menu.Item>
              <Menu.Item
                onClick={openExportModal}
                leftSection={<IconFileExport size={16} />}
              >
                {t("Export space")}
              </Menu.Item>
              <Menu.Item
                component={Link}
                to={`/s/${spaceSlug}/trash`}
                onClick={onNavigate}
                leftSection={<IconTrash size={16} />}
              >
                {t("Trash")}
              </Menu.Item>
            </>
          )}

          <Menu.Divider />
          <Menu.Item
            component={Link}
            to={APP_ROUTE.SPACES}
            onClick={onNavigate}
            leftSection={<IconLayoutGrid size={16} />}
          >
            {t("All spaces")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      {canManageSettings && (
        <SpaceIconPicker
          opened={iconOpened}
          onClose={closeIconPicker}
          spaceId={spaceId}
          spaceName={spaceName}
          hasLogo={!!spaceLogo}
        />
      )}

      {canManage && (
        <>
          {importMounted && (
            <Suspense fallback={null}>
              <PageImportModal
                spaceId={spaceId}
                open={importOpened}
                onClose={closeImportModal}
              />
            </Suspense>
          )}
          <ExportModal
            type="space"
            id={spaceId}
            open={exportOpened}
            onClose={closeExportModal}
          />
        </>
      )}
    </>
  );
}

function PagesMenu({ onSelectPages }: { onSelectPages: () => void }) {
  const { t } = useTranslation();
  const [sortOrder, setSortOrder] = useAtom(sortOrderAtom);

  const sortItem = (order: SortOrder, label: string) => (
    <Menu.Item
      rightSection={sortOrder === order ? <IconCheck size={14} /> : null}
      onClick={() => setSortOrder(order)}
    >
      {t(label)}
    </Menu.Item>
  );

  return (
    <Menu width={210} position="bottom-end">
      <Menu.Target>
        <Tooltip label={t("Sort & select")} withArrow position="top">
          <ActionIcon
            variant="subtle"
            color="gray"
            size={22}
            aria-label={t("Pages menu")}
          >
            <IconDots size={15} stroke={2} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconListCheck size={16} />}
          onClick={onSelectPages}
        >
          {t("Select pages")}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Label>{t("Sort pages")}</Menu.Label>
        {sortItem("manual", "Manual (drag to reorder)")}
        {sortItem("alphabetical-asc", "A to Z")}
        {sortItem("alphabetical-desc", "Z to A")}
        {sortItem("created-newest", "Date created (newest)")}
        {sortItem("created-oldest", "Date created (oldest)")}
        {sortItem("modified-newest", "Date modified (newest)")}
        {sortItem("modified-oldest", "Date modified (oldest)")}
      </Menu.Dropdown>
    </Menu>
  );
}
