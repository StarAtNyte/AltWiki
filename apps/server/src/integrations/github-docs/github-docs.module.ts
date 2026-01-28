import { Module } from '@nestjs/common';
import { GithubDocsController } from './github-docs.controller';
import { GithubDocsService } from './services/github-docs.service';
import { GithubFetcherService } from './services/github-fetcher.service';
import { GeminiService } from './services/gemini.service';
import { DocBuilderService } from './services/doc-builder.service';
import { PageModule } from '../../core/page/page.module';
import { SpaceModule } from '../../core/space/space.module';

@Module({
  imports: [PageModule, SpaceModule],
  controllers: [GithubDocsController],
  providers: [
    GithubDocsService,
    GithubFetcherService,
    GeminiService,
    DocBuilderService,
  ],
  exports: [GithubDocsService],
})
export class GithubDocsModule {}
