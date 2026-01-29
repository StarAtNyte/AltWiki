import {
  ActionIcon,
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
  IconDots,
  IconFileExport,
  IconHome,
  IconPlus,
  IconSettings,
  IconTemplate,
  IconTrash,
} from "@tabler/icons-react";
import classes from "./space-sidebar.module.css";
import React, { useCallback } from "react";
import { useAtom } from "jotai";
import { treeApiAtom } from "@/features/page/tree/atoms/tree-api-atom.ts";
import { selectedPageIdsAtom, selectionModeAtom, sortOrderAtom, SortOrder } from "@/features/page/tree/atoms/tree-data-atom.ts";
import { Link, useLocation, useParams } from "react-router-dom";
import clsx from "clsx";
import { useDisclosure } from "@mantine/hooks";
import SpaceSettingsModal from "@/features/space/components/settings-modal.tsx";
import { useGetSpaceBySlugQuery } from "@/features/space/queries/space-query.ts";
import { getSpaceUrl } from "@/lib/config.ts";
import SpaceTree from "@/features/page/tree/components/space-tree.tsx";
import BulkActionsBar from "@/features/page/tree/components/bulk-actions-bar.tsx";
import { useSpaceAbility } from "@/features/space/permissions/use-space-ability.ts";
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from "@/features/space/permissions/permissions.type.ts";
import PageImportModal from "@/features/page/components/page-import-modal.tsx";
import { useTranslation } from "react-i18next";
import { SwitchSpace } from "./switch-space";
import ExportModal from "@/components/common/export-modal";
import { mobileSidebarAtom } from "@/components/layouts/global/hooks/atoms/sidebar-atom.ts";
import { useToggleSidebar } from "@/components/layouts/global/hooks/hooks/use-toggle-sidebar.ts";
import { GithubDocsModal } from "@/features/github-docs";
import { TemplatePickerModal, useCreateFromTemplate, DocTemplate } from "@/features/templates";

export function SpaceSidebar() {
  const { t } = useTranslation();
  const [tree] = useAtom(treeApiAtom);
  const [selectedPageIds, setSelectedPageIds] = useAtom(selectedPageIdsAtom);
  const [selectionMode, setSelectionMode] = useAtom(selectionModeAtom);
  const location = useLocation();
  const [opened, { open: openSettings, close: closeSettings }] =
    useDisclosure(false);
  const [githubDocsOpened, { open: openGithubDocs, close: closeGithubDocs }] =
    useDisclosure(false);
  const [templateOpened, { open: openTemplates, close: closeTemplates }] =
    useDisclosure(false);
  const { createFromTemplate } = useCreateFromTemplate();
  const [mobileSidebarOpened] = useAtom(mobileSidebarAtom);
  const toggleMobileSidebar = useToggleSidebar(mobileSidebarAtom);

  const { spaceSlug } = useParams();
  const { data: space } = useGetSpaceBySlugQuery(spaceSlug);

  const spaceRules = space?.membership?.permissions;
  const spaceAbility = useSpaceAbility(spaceRules);

  const clearSelection = useCallback(() => {
    setSelectedPageIds(new Set());
    setSelectionMode(false);
    tree?.deselectAll();
  }, [setSelectedPageIds, setSelectionMode, tree]);

  const enableSelectionMode = useCallback(() => {
    setSelectionMode(true);
  }, [setSelectionMode]);

  const selectAllVisiblePages = useCallback(() => {
    if (tree) {
      const visibleIds = new Set<string>();
      tree.visibleNodes.forEach((node) => {
        visibleIds.add(node.id);
      });
      setSelectedPageIds(visibleIds);
    }
  }, [tree, setSelectedPageIds]);

  if (!space) {
    return <></>;
  }

  function handleCreatePage() {
    tree?.create({ parentId: null, type: "internal", index: 0 });
  }

  return (
    <>
      <div className={classes.navbar}>
        <div
          className={classes.section}
          style={{
            border: "none",
            marginTop: 2,
            marginBottom: 3,
          }}
        >
          <SwitchSpace
            spaceName={space?.name}
            spaceSlug={space?.slug}
            spaceIcon={space?.logo}
          />
        </div>

        <div className={classes.section}>
          <div className={classes.menuItems}>
            <UnstyledButton
              component={Link}
              to={getSpaceUrl(spaceSlug)}
              className={clsx(
                classes.menu,
                location.pathname.toLowerCase() === getSpaceUrl(spaceSlug)
                  ? classes.activeButton
                  : "",
              )}
            >
              <div className={classes.menuItemInner}>
                <IconHome
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("Overview")}</span>
              </div>
            </UnstyledButton>

            <UnstyledButton className={classes.menu} onClick={openSettings}>
              <div className={classes.menuItemInner}>
                <IconSettings
                  size={18}
                  className={classes.menuItemIcon}
                  stroke={2}
                />
                <span>{t("Space settings")}</span>
              </div>
            </UnstyledButton>

            {spaceAbility.can(
              SpaceCaslAction.Manage,
              SpaceCaslSubject.Page,
            ) && (
              <UnstyledButton
                className={classes.menu}
                onClick={() => {
                  handleCreatePage();
                  if (mobileSidebarOpened) {
                    toggleMobileSidebar();
                  }
                }}
              >
                <div className={classes.menuItemInner}>
                  <IconPlus
                    size={18}
                    className={classes.menuItemIcon}
                    stroke={2}
                  />
                  <span>{t("New page")}</span>
                </div>
              </UnstyledButton>
            )}

            {spaceAbility.can(
              SpaceCaslAction.Manage,
              SpaceCaslSubject.Page,
            ) && (
              <UnstyledButton
                className={classes.menu}
                onClick={openTemplates}
              >
                <div className={classes.menuItemInner}>
                  <IconTemplate
                    size={18}
                    className={classes.menuItemIcon}
                    stroke={2}
                  />
                  <span>{t("New from Template")}</span>
                </div>
              </UnstyledButton>
            )}

            {spaceAbility.can(
              SpaceCaslAction.Manage,
              SpaceCaslSubject.Page,
            ) && (
              <UnstyledButton
                className={classes.menu}
                onClick={openGithubDocs}
              >
                <div className={classes.menuItemInner}>
                  <IconBrandGithub
                    size={18}
                    className={classes.menuItemIcon}
                    stroke={2}
                  />
                  <span>{t("Generate from GitHub")}</span>
                </div>
              </UnstyledButton>
            )}
          </div>
        </div>

        <div className={clsx(classes.section, classes.sectionPages)}>
          {spaceAbility.can(
            SpaceCaslAction.Manage,
            SpaceCaslSubject.Page,
          ) && (
            <BulkActionsBar
              selectedIds={Array.from(selectedPageIds)}
              spaceId={space.id}
              spaceSlug={spaceSlug || ""}
              onClearSelection={clearSelection}
              selectionMode={selectionMode}
              onEnableSelectionMode={enableSelectionMode}
              onSelectAll={selectAllVisiblePages}
            />
          )}
          <Group className={classes.pagesHeader} justify="space-between">
            <Text size="xs" fw={500} c="dimmed">
              {t("Pages")}
            </Text>

            {spaceAbility.can(
              SpaceCaslAction.Manage,
              SpaceCaslSubject.Page,
            ) && (
              <Group gap="xs">
                <SpaceMenu spaceId={space.id} onSpaceSettings={openSettings} />

                <Tooltip label={t("Create page")} withArrow position="right">
                  <ActionIcon
                    variant="default"
                    size={18}
                    onClick={handleCreatePage}
                    aria-label={t("Create page")}
                  >
                    <IconPlus />
                  </ActionIcon>
                </Tooltip>
              </Group>
            )}
          </Group>

          <div className={classes.pages}>
            <SpaceTree
              spaceId={space.id}
              readOnly={spaceAbility.cannot(
                SpaceCaslAction.Manage,
                SpaceCaslSubject.Page,
              )}
            />
          </div>
        </div>
      </div>

      <SpaceSettingsModal
        opened={opened}
        onClose={closeSettings}
        spaceId={space?.slug}
      />

      <GithubDocsModal
        opened={githubDocsOpened}
        onClose={closeGithubDocs}
      />

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
    </>
  );
}

interface SpaceMenuProps {
  spaceId: string;
  onSpaceSettings: () => void;
}
function SpaceMenu({ spaceId, onSpaceSettings }: SpaceMenuProps) {
  const { t } = useTranslation();
  const { spaceSlug } = useParams();
  const [importOpened, { open: openImportModal, close: closeImportModal }] =
    useDisclosure(false);
  const [exportOpened, { open: openExportModal, close: closeExportModal }] =
    useDisclosure(false);
  const [sortOrder, setSortOrder] = useAtom(sortOrderAtom);

  const handleSortChange = (order: SortOrder) => {
    setSortOrder(order);
  };

  return (
    <>
      <Menu width={200} shadow="md" withArrow>
        <Menu.Target>
          <Tooltip
            label={t("Import pages & space settings")}
            withArrow
            position="top"
          >
            <ActionIcon
              variant="default"
              size={18}
              aria-label={t("Space menu")}
            >
              <IconDots />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>

        <Menu.Dropdown>
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

          <Menu.Divider />

          <Menu.Label>{t("Sort pages")}</Menu.Label>
          <Menu.Item
            rightSection={sortOrder === "alphabetical-asc" ? <IconCheck size={14} /> : null}
            onClick={() => handleSortChange("alphabetical-asc")}
          >
            {t("A to Z")}
          </Menu.Item>
          <Menu.Item
            rightSection={sortOrder === "alphabetical-desc" ? <IconCheck size={14} /> : null}
            onClick={() => handleSortChange("alphabetical-desc")}
          >
            {t("Z to A")}
          </Menu.Item>
          <Menu.Item
            rightSection={sortOrder === "created-newest" ? <IconCheck size={14} /> : null}
            onClick={() => handleSortChange("created-newest")}
          >
            {t("Date created (newest)")}
          </Menu.Item>
          <Menu.Item
            rightSection={sortOrder === "created-oldest" ? <IconCheck size={14} /> : null}
            onClick={() => handleSortChange("created-oldest")}
          >
            {t("Date created (oldest)")}
          </Menu.Item>
          <Menu.Item
            rightSection={sortOrder === "modified-newest" ? <IconCheck size={14} /> : null}
            onClick={() => handleSortChange("modified-newest")}
          >
            {t("Date modified (newest)")}
          </Menu.Item>
          <Menu.Item
            rightSection={sortOrder === "modified-oldest" ? <IconCheck size={14} /> : null}
            onClick={() => handleSortChange("modified-oldest")}
          >
            {t("Date modified (oldest)")}
          </Menu.Item>

          <Menu.Divider />

          <Menu.Item
            onClick={onSpaceSettings}
            leftSection={<IconSettings size={16} />}
          >
            {t("Space settings")}
          </Menu.Item>

          <Menu.Item
            component={Link}
            to={`/s/${spaceSlug}/trash`}
            leftSection={<IconTrash size={16} />}
          >
            {t("Trash")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <PageImportModal
        spaceId={spaceId}
        open={importOpened}
        onClose={closeImportModal}
      />

      <ExportModal
        type="space"
        id={spaceId}
        open={exportOpened}
        onClose={closeExportModal}
      />
    </>
  );
}
