import { useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { createPage } from "@/features/page/services/page-service";
import { buildPageUrl } from "@/features/page/page.utils";
import { DocTemplate } from "../data/templates";
import { invalidateOnCreatePage } from "@/features/page/queries/page-query";
import { useAtom } from "jotai";
import { treeDataAtom } from "@/features/page/tree/atoms/tree-data-atom";
import { SpaceTreeNode } from "@/features/page/tree/types";
import { SimpleTree } from "react-arborist";
import { useQueryEmit } from "@/features/websocket/use-query-emit";

interface CreateFromTemplateParams {
  template: DocTemplate;
  spaceId: string;
  parentPageId?: string;
}

export function useCreateFromTemplate() {
  const navigate = useNavigate();
  const { spaceSlug } = useParams();
  const [treeData, setTreeData] = useAtom(treeDataAtom);
  const emit = useQueryEmit();

  const mutation = useMutation({
    mutationFn: async ({ template, spaceId, parentPageId }: CreateFromTemplateParams) => {
      // Create the page with template title and markdown content
      const page = await createPage({
        spaceId,
        parentPageId,
        title: template.name,
        markdownContent: template.content,
      });

      return { page, template };
    },
    onSuccess: ({ page, template }) => {
      invalidateOnCreatePage(page);

      // Add the new page to the tree data atom directly
      const treeApi = new SimpleTree<SpaceTreeNode>(treeData);

      // Create the tree node data
      const nodeData: SpaceTreeNode = {
        id: page.id,
        slugId: page.slugId,
        name: page.title || template.name,
        icon: page.icon,
        position: page.position,
        spaceId: page.spaceId,
        parentPageId: page.parentPageId,
        hasChildren: false,
        children: [],
      };

      // Determine the parent and index
      const parentId = page.parentPageId || null;
      let index = 0;

      if (parentId) {
        const parentNode = treeApi.find(parentId);
        if (parentNode) {
          index = parentNode.children?.length || 0;
        }
      } else {
        // Root level page
        index = treeApi.data.length;
      }

      // Add the node to the tree
      treeApi.create({
        parentId,
        index,
        data: nodeData,
      });

      // Update the tree data
      setTreeData(treeApi.data);

      // Emit websocket event to sync with other users
      setTimeout(() => {
        emit({
          operation: "addTreeNode",
          spaceId: page.spaceId,
          payload: {
            parentId,
            index,
            data: nodeData,
          },
        });
      }, 50);

      // Navigate to the new page
      const pageUrl = buildPageUrl(spaceSlug, page.slugId, page.title);
      navigate(pageUrl);

      notifications.show({
        title: "Page created",
        message: `Created "${template.name}" from template`,
        color: "green",
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "Failed to create page from template",
        color: "red",
      });
    },
  });

  return {
    createFromTemplate: mutation.mutate,
    isLoading: mutation.isPending,
  };
}
