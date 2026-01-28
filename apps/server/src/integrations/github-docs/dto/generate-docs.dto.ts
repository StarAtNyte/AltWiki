import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';

export class GenerateDocsDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/, {
    message: 'Must be a valid GitHub repository URL',
  })
  url: string;

  @IsUUID()
  @IsNotEmpty()
  spaceId: string;
}

export interface RepoMetadata {
  owner: string;
  repo: string;
  description: string;
  stars: number;
  forks: number;
  license: string | null;
  defaultBranch: string;
  language: string | null;
}

export interface RepoFile {
  path: string;
  content: string;
  size: number;
}

export interface RepoAnalysis {
  metadata: RepoMetadata;
  files: RepoFile[];
  tree: string;
  totalFiles: number;
  totalSize: number;
  estimatedTokens: number;
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
  status: 'fetching' | 'analyzing' | 'generating' | 'creating' | 'complete' | 'error';
  progress: number;
  message: string;
  pageIds?: string[];
  pages?: PageInfo[];
  error?: string;
}

export interface GeneratedDoc {
  title: string;
  content: string;
  order: number;
}
