import api from "@/lib/api-client";

export interface GenerateDocsRequest {
  url: string;
  spaceId: string;
}

export interface GenerateDocsResponse {
  jobId: string;
  message: string;
}

export interface PageInfo {
  id: string;
  slugId: string;
  title: string;
  icon?: string;
  position: string;
  spaceId: string;
  parentPageId?: string;
  hasChildren: boolean;
}

export interface GenerationProgress {
  status: "fetching" | "analyzing" | "generating" | "creating" | "complete" | "error";
  progress: number;
  message: string;
  pageIds?: string[];
  pages?: PageInfo[];
  error?: string;
}

export async function generateDocs(data: GenerateDocsRequest): Promise<GenerateDocsResponse> {
  return api.post("/github-docs/generate", data);
}

export async function getGenerationStatus(jobId: string): Promise<GenerationProgress> {
  return api.get(`/github-docs/status/${jobId}`);
}
