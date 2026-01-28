import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GithubDocsService } from './services/github-docs.service';
import { GenerateDocsDto } from './dto/generate-docs.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';

@UseGuards(JwtAuthGuard)
@Controller('github-docs')
export class GithubDocsController {
  constructor(private readonly githubDocsService: GithubDocsService) {}

  @HttpCode(HttpStatus.OK)
  @Post('/generate')
  async generateDocs(
    @Body() dto: GenerateDocsDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const jobId = await this.githubDocsService.startGeneration(
      dto.url,
      dto.spaceId,
      workspace.id,
      user.id,
    );

    return {
      jobId,
      message: 'Documentation generation started',
    };
  }

  @HttpCode(HttpStatus.OK)
  @Get('/status/:jobId')
  async getStatus(@Param('jobId') jobId: string) {
    const progress = this.githubDocsService.getProgress(jobId);

    if (!progress) {
      throw new NotFoundException('Job not found');
    }

    return progress;
  }
}
