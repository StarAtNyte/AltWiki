import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useRef } from "react";
import {
  generateDocs,
  getGenerationStatus,
  GenerateDocsRequest,
  GenerationProgress,
} from "../api/github-docs.api";
import { notifications } from "@mantine/notifications";
import { useAtom } from "jotai";
import { treeDataAtom } from "@/features/page/tree/atoms/tree-data-atom";
import { SpaceTreeNode } from "@/features/page/tree/types";
import { SimpleTree } from "react-arborist";
import { useQueryEmit } from "@/features/websocket/use-query-emit";

export function useGenerateDocs() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const currentSpaceIdRef = useRef<string | null>(null);
  const [treeData, setTreeData] = useAtom(treeDataAtom);
  const emit = useQueryEmit();

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const invalidateQueries = useCallback(() => {
    const spaceId = currentSpaceIdRef.current;
    if (spaceId) {
      queryClient.invalidateQueries({ queryKey: ["github-docs", spaceId] });
      queryClient.invalidateQueries({ queryKey: ["space-tree", spaceId] });
    }
  }, [queryClient]);

  const addPagesToTree = useCallback(
    (pages: GenerationProgress["pages"]) => {
      if (!pages || pages.length === 0) return;

      const treeApi = new SimpleTree<SpaceTreeNode>(treeData);

      pages.forEach((page, idx) => {
        // Create the tree node data
        const nodeData: SpaceTreeNode = {
          id: page.id,
          slugId: page.slugId,
          name: page.title || "Untitled",
          icon: page.icon,
          position: page.position,
          spaceId: page.spaceId,
          parentPageId: page.parentPageId,
          hasChildren: page.hasChildren || false,
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
          // Root level page - add at the end
          index = treeApi.data.length;
        }

        // Check if node already exists in tree
        if (!treeApi.find(page.id)) {
          // Add the node to the tree
          treeApi.create({
            parentId,
            index,
            data: nodeData,
          });

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
          }, 50 + idx * 10); // Stagger the emissions slightly
        }
      });

      // Update the tree data
      setTreeData(treeApi.data);
    },
    [treeData, setTreeData, emit]
  );

  const pollStatus = useCallback(
    async (jobId: string) => {
      try {
        const response = await getGenerationStatus(jobId);
        // Handle wrapped response
        const status = (response as any)?.data || response;
        setProgress(status);

        if (status.status === "complete") {
          stopPolling();
          invalidateQueries();

          // Add pages to the tree for immediate sidebar update
          if (status.pages && status.pages.length > 0) {
            addPagesToTree(status.pages);
          }

          notifications.show({
            title: "Success",
            message: "Documentation generated successfully!",
            color: "green",
          });
        } else if (status.status === "error") {
          stopPolling();
          notifications.show({
            title: "Error",
            message: status.error || "Generation failed",
            color: "red",
          });
        }
      } catch (error) {
        console.error("Failed to poll status:", error);
      }
    },
    [stopPolling, invalidateQueries, addPagesToTree]
  );

  const startPolling = useCallback(
    (jobId: string) => {
      setIsPolling(true);
      pollStatus(jobId);
      pollingRef.current = setInterval(() => pollStatus(jobId), 2000);
    },
    [pollStatus]
  );

  const mutation = useMutation({
    mutationFn: (data: GenerateDocsRequest) => {
      currentSpaceIdRef.current = data.spaceId;
      return generateDocs(data);
    },
    onSuccess: (response: any) => {
      // Response might be wrapped - handle both response.data and direct response
      const data = response?.data || response;
      const jobId = data?.jobId;
      
      console.log("Generate response:", response);
      console.log("Extracted jobId:", jobId);
      
      if (!jobId) {
        console.error("No jobId in response:", response);
        notifications.show({
          title: "Error",
          message: "Failed to get job ID from server",
          color: "red",
        });
        return;
      }
      
      setProgress({
        status: "fetching",
        progress: 0,
        message: "Starting generation...",
      });
      startPolling(jobId);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "Failed to start generation";
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
      });
    },
  });

  const reset = useCallback(() => {
    stopPolling();
    setProgress(null);
    currentSpaceIdRef.current = null;
  }, [stopPolling]);

  return {
    generate: mutation.mutate,
    isLoading: mutation.isPending || isPolling,
    progress,
    reset,
  };
}
