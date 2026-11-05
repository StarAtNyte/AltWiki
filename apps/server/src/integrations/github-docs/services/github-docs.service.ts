import { Injectable, Logger } from '@nestjs/common';
import { GithubFetcherService } from './github-fetcher.service';
import { GeminiService } from './gemini.service';
import { DocBuilderService } from './doc-builder.service';
import { GenerationProgress } from '../dto/generate-docs.dto';
import { Page } from '@docmost/db/types/entity.types';

interface GenerationJob {
  id: string;
  url: string;
  spaceId: string;
  workspaceId: string;
  userId: string;
  progress: GenerationProgress;
  pages?: Page[];
}

@Injectable()
export class GithubDocsService {
  private readonly logger = new Logger(GithubDocsService.name);
  private readonly jobs = new Map<string, GenerationJob>();

  constructor(
    private readonly githubFetcher: GithubFetcherService,
    private readonly geminiService: GeminiService,
    private readonly docBuilder: DocBuilderService,
  ) {}

  async startGeneration(
    url: string,
    spaceId: string,
    workspaceId: string,
    userId: string,
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const job: GenerationJob = {
      id: jobId,
      url,
      spaceId,
      workspaceId,
      userId,
      progress: {
        status: 'fetching',
        progress: 0,
        message: 'Starting...',
      },
    };

    this.jobs.set(jobId, job);

    this.runGeneration(job).catch((error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Generation failed for job ${jobId}: ${errorMessage}`);
      this.logger.error(`Stack trace: ${errorStack}`);
      job.progress = {
        status: 'error',
        progress: 0,
        message: 'Generation failed',
        error: errorMessage,
      };
    });

    return jobId;
  }

  getProgress(jobId: string): GenerationProgress | null {
    this.logger.log(`getProgress called for jobId: ${jobId}, jobs in Map: ${Array.from(this.jobs.keys()).join(', ')}`);
    const job = this.jobs.get(jobId);
    if (!job) {
      this.logger.warn(`Job not found: ${jobId}`);
    }
    return job?.progress || null;
  }

  private async runGeneration(job: GenerationJob): Promise<void> {
    try {
      job.progress = {
        status: 'fetching',
        progress: 10,
        message: 'Fetching repository...',
      };

      const analysis = await this.githubFetcher.analyzeRepository(job.url);

      this.logger.log(
        `Analyzed ${analysis.metadata.owner}/${analysis.metadata.repo}: ${analysis.totalFiles} files, ~${analysis.estimatedTokens} tokens`,
      );

      job.progress = {
        status: 'analyzing',
        progress: 30,
        message: `Analyzed ${analysis.totalFiles} files...`,
      };

      job.progress = {
        status: 'generating',
        progress: 50,
        message: 'Generating documentation with AI...',
      };

      const generatedDocs = await this.geminiService.generateDocumentation(
        analysis,
        job.workspaceId,
      );

      this.logger.log(`Generated ${generatedDocs.length} documentation sections`);

      job.progress = {
        status: 'creating',
        progress: 80,
        message: 'Creating pages in Docmost...',
      };

      const pages = await this.docBuilder.createDocPages(
        generatedDocs,
        analysis.metadata,
        job.spaceId,
        job.workspaceId,
        job.userId,
      );

      job.pages = pages;

      job.progress = {
        status: 'complete',
        progress: 100,
        message: 'Documentation generated successfully!',
        pageIds: pages.map((p) => p.id),
        pages: pages.map((p) => ({
          id: p.id,
          slugId: p.slugId,
          title: p.title,
          icon: p.icon,
          position: p.position,
          spaceId: p.spaceId,
          parentPageId: p.parentPageId,
          hasChildren: pages.some((child) => child.parentPageId === p.id),
        })),
      };

      this.logger.log(`Successfully created ${pages.length} pages for job ${job.id}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in generation job ${job.id}: ${errorMessage}`);
      this.logger.error(`Stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
      throw error;
    }
  }
}
