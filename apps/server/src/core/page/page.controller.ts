import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PageService } from './services/page.service';
import { BacklinkService } from './services/backlink.service';
import { PageAccessService } from './page-access/page-access.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { MovePageDto, MovePageToSpaceDto } from './dto/move-page.dto';
import {
  DeletePageDto,
  PageHistoryIdDto,
  PageIdDto,
  PageInfoDto,
} from './dto/page.dto';
import { PageHistoryService } from './services/page-history.service';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OAuthScope } from '../../common/decorators/oauth-scope.decorator';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { Page, User, Workspace } from '@docmost/db/types/entity.types';
import { SidebarPageDto } from './dto/sidebar-page.dto';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../casl/interfaces/space-ability.type';
import SpaceAbilityFactory from '../casl/abilities/space-ability.factory';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { RecentPageDto } from './dto/recent-page.dto';
import { CreatedByUserDto } from './dto/created-by-user.dto';
import { DuplicatePageDto } from './dto/duplicate-page.dto';
import {
  BulkDeletePagesDto,
  BulkDuplicatePagesDto,
  BulkMovePagesDto,
  BulkRestorePagesDto,
} from './dto/bulk-page.dto';
import { DeletedPageDto } from './dto/deleted-page.dto';
import { BacklinksListDto } from './dto/backlink.dto';
import { LabelService } from '../label/label.service';
import { AddLabelsDto, RemoveLabelDto } from '../label/dto/label.dto';
import {
  jsonToHtml,
  jsonToMarkdown,
} from '../../collaboration/collaboration.util';
import { AuditEvent, AuditResource } from '../../common/events/audit-events';
import {
  AUDIT_SERVICE,
  IAuditService,
} from '../../integrations/audit/audit.service';
import { getPageTitle } from '../../common/helpers';
import { ChangePageOwnerDto } from './dto/change-owner.dto';
import WorkspaceAbilityFactory from '../casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../casl/interfaces/workspace-ability.type';

@UseGuards(JwtAuthGuard)
@Controller('pages')
export class PageController {
  private readonly logger = new Logger(PageController.name);

  constructor(
    private readonly pageService: PageService,
    private readonly pageRepo: PageRepo,
    private readonly pageHistoryService: PageHistoryService,
    private readonly spaceAbility: SpaceAbilityFactory,
    private readonly pageAccessService: PageAccessService,
    private readonly backlinkService: BacklinkService,
    private readonly labelService: LabelService,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
    @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('/info')
  @OAuthScope('read')
  async getPage(@Body() dto: PageInfoDto, @AuthUser() user: User) {
    const page = await this.pageRepo.findById(dto.pageId, {
      includeSpace: true,
      includeContent: true,
      includeCreator: true,
      includeLastUpdatedBy: true,
      includeContributors: true,
      includeDeletedBy: true,
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const { canEdit, hasRestriction } =
      await this.pageAccessService.validateCanViewWithPermissions(page, user);

    const permissions = { canEdit, hasRestriction };

    if (dto.format && dto.format !== 'json' && page.content) {
      const contentOutput =
        dto.format === 'markdown'
          ? jsonToMarkdown(page.content)
          : jsonToHtml(page.content);
      return {
        ...page,
        content: contentOutput,
        permissions,
      };
    }

    return { ...page, permissions };
  }

  @HttpCode(HttpStatus.OK)
  @Post('labels')
  async getPageLabels(
    @Body() dto: PageIdDto,
    @Body() pagination: PaginationOptions,
    @AuthUser() user: User,
  ) {
    const page = await this.pageRepo.findById(dto.pageId);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    await this.pageAccessService.validateCanView(page, user);

    return this.labelService.getPageLabels(page.id, pagination);
  }

  @HttpCode(HttpStatus.OK)
  @Post('labels/add')
  async addPageLabels(
    @Body() dto: AddLabelsDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const page = await this.pageRepo.findById(dto.pageId);
    if (!page || page.deletedAt) {
      throw new NotFoundException('Page not found');
    }

    await this.pageAccessService.validateCanEdit(page, user);

    return this.labelService.addLabelsToPage(
      page.id,
      dto.names,
      workspace.id,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('labels/remove')
  async removePageLabel(
    @Body() dto: RemoveLabelDto,
    @AuthUser() user: User,
  ) {
    const page = await this.pageRepo.findById(dto.pageId);
    if (!page || page.deletedAt) {
      throw new NotFoundException('Page not found');
    }

    await this.pageAccessService.validateCanEdit(page, user);

    await this.labelService.removeLabelFromPage(
      page.id,
      dto.labelId,
      page.workspaceId,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('backlinks-count')
  async getBacklinksCount(
    @Body() dto: PageIdDto,
    @AuthUser() user: User,
  ): Promise<{ incoming: number; outgoing: number }> {
    const page = await this.pageRepo.findById(dto.pageId);
    if (!page) {
      throw new NotFoundException('Page not found');
    }
    await this.pageAccessService.validateCanView(page, user);

    return this.backlinkService.countByPageId(page.id, user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('backlinks')
  async getBacklinks(
    @Body() dto: BacklinksListDto,
    @Body() pagination: PaginationOptions,
    @AuthUser() user: User,
  ) {
    const page = await this.pageRepo.findById(dto.pageId);
    if (!page) {
      throw new NotFoundException('Page not found');
    }
    await this.pageAccessService.validateCanView(page, user);

    return this.backlinkService.findByPageId(
      page.id,
      dto.direction,
      user.id,
      pagination,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('create')
  @OAuthScope('write')
  async create(
    @Body() createPageDto: CreatePageDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    if (createPageDto.parentPageId) {
      // Creating under a parent page - check edit permission on parent
      const parentPage = await this.pageRepo.findById(
        createPageDto.parentPageId,
      );
      if (
        !parentPage ||
        parentPage.deletedAt ||
        parentPage.spaceId !== createPageDto.spaceId
      ) {
        throw new NotFoundException('Parent page not found');
      }
      await this.pageAccessService.validateCanEdit(parentPage, user);
    } else {
      // Creating at root level - require space-level permission
      const ability = await this.spaceAbility.createForUser(
        user,
        createPageDto.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Create, SpaceCaslSubject.Page)) {
        throw new ForbiddenException();
      }
    }

    const page = await this.pageService.create(
      user.id,
      workspace.id,
      createPageDto,
    );

    const { canEdit, hasRestriction } =
      await this.pageAccessService.validateCanViewWithPermissions(page, user);

    const permissions = { canEdit, hasRestriction };

    this.auditService.log({
      event: AuditEvent.PAGE_CREATED,
      resourceType: AuditResource.PAGE,
      resourceId: page.id,
      spaceId: page.spaceId,
      changes: {
        after: {
          title: getPageTitle(page.title),
          spaceId: page.spaceId,
        },
      },
    });

    if (
      createPageDto.format &&
      createPageDto.format !== 'json' &&
      page.content
    ) {
      const contentOutput =
        createPageDto.format === 'markdown'
          ? jsonToMarkdown(page.content)
          : jsonToHtml(page.content);
      return { ...page, content: contentOutput, permissions };
    }

    return { ...page, permissions };
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  @OAuthScope('write')
  async update(@Body() updatePageDto: UpdatePageDto, @AuthUser() user: User) {
    const page = await this.pageRepo.findById(updatePageDto.pageId);

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const { hasRestriction } = await this.pageAccessService.validateCanEdit(
      page,
      user,
    );

    const updatedPage = await this.pageService.update(
      page,
      updatePageDto,
      user,
    );

    const permissions = { canEdit: true, hasRestriction };

    if (
      updatePageDto.format &&
      updatePageDto.format !== 'json' &&
      updatedPage.content
    ) {
      const contentOutput =
        updatePageDto.format === 'markdown'
          ? jsonToMarkdown(updatedPage.content)
          : jsonToHtml(updatedPage.content);
      return { ...updatedPage, content: contentOutput, permissions };
    }

    return { ...updatedPage, permissions };
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete')
  async delete(
    @Body() deletePageDto: DeletePageDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const page = await this.pageRepo.findById(deletePageDto.pageId);

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const ability = await this.spaceAbility.createForUser(user, page.spaceId);

    if (deletePageDto.permanentlyDelete) {
      // Permanent deletion requires space admin permissions
      if (ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Settings)) {
        throw new ForbiddenException(
          'Only space admins can permanently delete pages',
        );
      }
      await this.pageService.forceDelete(deletePageDto.pageId, workspace.id);

      this.auditService.log({
        event: AuditEvent.PAGE_DELETED,
        resourceType: AuditResource.PAGE,
        resourceId: page.id,
        spaceId: page.spaceId,
        changes: {
          before: {
            pageId: page.id,
            slugId: page.slugId,
            title: getPageTitle(page.title),
            spaceId: page.spaceId,
          },
        },
      });
    } else {
      // User with edit permission can delete
      await this.pageAccessService.validateCanEdit(page, user);

      await this.pageService.removePage(
        deletePageDto.pageId,
        user.id,
        workspace.id,
      );

      this.auditService.log({
        event: AuditEvent.PAGE_TRASHED,
        resourceType: AuditResource.PAGE,
        resourceId: page.id,
        spaceId: page.spaceId,
        changes: {
          before: {
            pageId: page.id,
            slugId: page.slugId,
            title: getPageTitle(page.title),
            spaceId: page.spaceId,
          },
        },
      });
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('restore')
  async restore(
    @Body() pageIdDto: PageIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const page = await this.pageRepo.findById(pageIdDto.pageId);

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    // only users with "can edit" space level permission can restore pages
    const ability = await this.spaceAbility.createForUser(user, page.spaceId);
    if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    // make sure they have page level access to the page
    await this.pageAccessService.validateCanEdit(page, user);

    await this.pageRepo.restorePage(pageIdDto.pageId, workspace.id);

    this.auditService.log({
      event: AuditEvent.PAGE_RESTORED,
      resourceType: AuditResource.PAGE,
      resourceId: page.id,
      spaceId: page.spaceId,
      changes: {
        after: {
          title: getPageTitle(page.title),
          spaceId: page.spaceId,
        },
      },
    });

    return this.pageRepo.findById(pageIdDto.pageId, {
      includeHasChildren: true,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('recent')
  @OAuthScope('read')
  async getRecentPages(
    @Body() recentPageDto: RecentPageDto,
    @Body() pagination: PaginationOptions,
    @AuthUser() user: User,
  ) {
    if (recentPageDto.spaceId) {
      const ability = await this.spaceAbility.createForUser(
        user,
        recentPageDto.spaceId,
      );

      if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw new ForbiddenException();
      }

      return this.pageService.getRecentSpacePages(
        recentPageDto.spaceId,
        user.id,
        pagination,
      );
    }

    return this.pageService.getRecentPages(user.id, pagination);
  }

  @HttpCode(HttpStatus.OK)
  @Post('created-by-user')
  async getCreatedByPages(
    @Body() dto: CreatedByUserDto,
    @Body() pagination: PaginationOptions,
    @AuthUser() user: User,
  ) {
    const targetUserId = dto.userId ?? user.id;

    if (dto.spaceId) {
      const ability = await this.spaceAbility.createForUser(
        user,
        dto.spaceId,
      );

      if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw new ForbiddenException();
      }
    }

    return this.pageService.getCreatedByPages(targetUserId, user.id, pagination, dto.spaceId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('trash')
  async getDeletedPages(
    @Body() deletedPageDto: DeletedPageDto,
    @Body() pagination: PaginationOptions,
    @AuthUser() user: User,
  ) {
    if (deletedPageDto.spaceId) {
      const ability = await this.spaceAbility.createForUser(
        user,
        deletedPageDto.spaceId,
      );

      if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
        throw new ForbiddenException();
      }

      return this.pageService.getDeletedSpacePages(
        deletedPageDto.spaceId,
        user.id,
        pagination,
      );
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('/history')
  async getPageHistory(
    @Body() dto: PageIdDto,
    @Body() pagination: PaginationOptions,
    @AuthUser() user: User,
  ) {
    const page = await this.pageRepo.findById(dto.pageId);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    await this.pageAccessService.validateCanView(page, user);

    return this.pageHistoryService.findHistoryByPageId(page.id, pagination);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/history/info')
  async getPageHistoryInfo(
    @Body() dto: PageHistoryIdDto,
    @AuthUser() user: User,
  ) {
    const history = await this.pageHistoryService.findById(dto.historyId);
    if (!history) {
      throw new NotFoundException('Page history not found');
    }

    // Get the page to check permissions
    const page = await this.pageRepo.findById(history.pageId);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    await this.pageAccessService.validateCanView(page, user);

    return history;
  }

  @HttpCode(HttpStatus.OK)
  @Post('/sidebar-pages')
  @OAuthScope('read')
  async getSidebarPages(
    @Body() dto: SidebarPageDto,
    @Body() pagination: PaginationOptions,
    @AuthUser() user: User,
  ) {
    if (!dto.spaceId && !dto.pageId) {
      throw new BadRequestException(
        'Either spaceId or pageId must be provided',
      );
    }
    let spaceId = dto.spaceId;

    if (dto.pageId) {
      const page = await this.pageRepo.findById(dto.pageId);
      if (!page) {
        throw new ForbiddenException();
      }

      spaceId = page.spaceId;
    }

    const ability = await this.spaceAbility.createForUser(user, spaceId);
    if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    const spaceCanEdit = ability.can(
      SpaceCaslAction.Edit,
      SpaceCaslSubject.Page,
    );

    return this.pageService.getSidebarPages(
      spaceId,
      pagination,
      dto.pageId,
      user.id,
      spaceCanEdit,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('move-to-space')
  @OAuthScope('write')
  async movePageToSpace(
    @Body() dto: MovePageToSpaceDto,
    @AuthUser() user: User,
  ) {
    const movedPage = await this.pageRepo.findById(dto.pageId);
    if (!movedPage) {
      throw new NotFoundException('Page to move not found');
    }
    if (movedPage.spaceId === dto.spaceId) {
      throw new BadRequestException('Page is already in this space');
    }

    const abilities = await Promise.all([
      this.spaceAbility.createForUser(user, movedPage.spaceId),
      this.spaceAbility.createForUser(user, dto.spaceId),
    ]);

    if (
      abilities.some((ability) =>
        ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page),
      )
    ) {
      throw new ForbiddenException();
    }

    // Check page-level edit permission on the source page
    await this.pageAccessService.validateCanEdit(movedPage, user);

    // Moves only accessible pages; inaccessible child pages become root pages in original space
    const { childPageIds } = await this.pageService.movePageToSpace(
      movedPage,
      dto.spaceId,
      user.id,
    );

    this.auditService.log({
      event: AuditEvent.PAGE_MOVED_TO_SPACE,
      resourceType: AuditResource.PAGE,
      resourceId: movedPage.id,
      spaceId: movedPage.spaceId,
      changes: {
        before: { spaceId: movedPage.spaceId },
        after: { spaceId: dto.spaceId },
      },
      metadata: {
        title: getPageTitle(movedPage.title),
        ...(childPageIds.length > 0 && { childPageIds }),
      },
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('duplicate')
  @OAuthScope('write')
  async duplicatePage(@Body() dto: DuplicatePageDto, @AuthUser() user: User) {
    const copiedPage = await this.pageRepo.findById(dto.pageId);
    if (!copiedPage) {
      throw new NotFoundException('Page to copy not found');
    }

    // Check page-level view permission on the source page (need to read to copy)
    // Inaccessible child branches are automatically skipped during duplication
    await this.pageAccessService.validateCanView(copiedPage, user);

    let result;

    // If spaceId is provided, it's a copy to different space
    if (dto.spaceId) {
      const abilities = await Promise.all([
        this.spaceAbility.createForUser(user, copiedPage.spaceId),
        this.spaceAbility.createForUser(user, dto.spaceId),
      ]);

      if (
        abilities.some((ability) =>
          ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page),
        )
      ) {
        throw new ForbiddenException();
      }

      result = await this.pageService.duplicatePage(
        copiedPage,
        dto.spaceId,
        user,
      );

      this.auditService.log({
        event: AuditEvent.PAGE_DUPLICATED,
        resourceType: AuditResource.PAGE,
        resourceId: result.id,
        spaceId: dto.spaceId,
        metadata: {
          sourcePageId: copiedPage.id,
          title: getPageTitle(copiedPage.title),
          sourceSpaceId: copiedPage.spaceId,
          targetSpaceId: dto.spaceId,
          ...(result.childPageIds.length > 0 && {
            childPageIds: result.childPageIds,
          }),
        },
      });
    } else {
      // If no spaceId, it's a duplicate in same space
      const ability = await this.spaceAbility.createForUser(
        user,
        copiedPage.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
        throw new ForbiddenException();
      }

      result = await this.pageService.duplicatePage(
        copiedPage,
        undefined,
        user,
      );

      this.auditService.log({
        event: AuditEvent.PAGE_DUPLICATED,
        resourceType: AuditResource.PAGE,
        resourceId: result.id,
        spaceId: copiedPage.spaceId,
        metadata: {
          sourcePageId: copiedPage.id,
          title: getPageTitle(copiedPage.title),
          ...(result.childPageIds.length > 0 && {
            childPageIds: result.childPageIds,
          }),
        },
      });
    }

    return result;
  }

  // AltWiki: reassign page owner (creator). Workspace owners/admins, or
  // admins of the page's space only.
  @HttpCode(HttpStatus.OK)
  @Post('change-owner')
  @OAuthScope('write')
  async changeOwner(
    @Body() dto: ChangePageOwnerDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const page = await this.pageRepo.findById(dto.pageId);
    if (!page || page.deletedAt || page.workspaceId !== workspace.id) {
      throw new NotFoundException('Page not found');
    }

    const wsAbility = this.workspaceAbility.createForUser(user, workspace);
    const isWorkspaceAdmin = wsAbility.can(
      WorkspaceCaslAction.Manage,
      WorkspaceCaslSubject.Settings,
    );

    if (!isWorkspaceAdmin) {
      let isSpaceAdmin = false;
      try {
        const ability = await this.spaceAbility.createForUser(
          user,
          page.spaceId,
        );
        isSpaceAdmin = ability.can(
          SpaceCaslAction.Manage,
          SpaceCaslSubject.Settings,
        );
      } catch {
        isSpaceAdmin = false;
      }
      if (!isSpaceAdmin) {
        throw new ForbiddenException(
          'Only workspace or space admins can change the page owner',
        );
      }
    }

    const result = await this.pageService.changeOwner(
      page,
      dto.userId,
      workspace.id,
      !!dto.includeSubpages,
    );

    this.auditService.log({
      event: AuditEvent.PAGE_OWNER_CHANGED,
      resourceType: AuditResource.PAGE,
      resourceId: page.id,
      spaceId: page.spaceId,
      changes: {
        before: { creatorId: result.previousOwnerId },
        after: { creatorId: result.newOwner.id },
      },
      metadata: {
        title: getPageTitle(page.title),
        includeSubpages: !!dto.includeSubpages,
        pageCount: result.pageIds.length,
      },
    });

    return {
      pageId: page.id,
      slugId: page.slugId,
      updatedCount: result.pageIds.length,
      creator: result.newOwner,
      ...(result.warning && { warning: result.warning }),
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('move')
  @OAuthScope('write')
  async movePage(@Body() dto: MovePageDto, @AuthUser() user: User) {
    const movedPage = await this.pageRepo.findById(dto.pageId);
    if (!movedPage) {
      throw new NotFoundException('Moved page not found');
    }

    const ability = await this.spaceAbility.createForUser(
      user,
      movedPage.spaceId,
    );

    if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    // Check page-level edit permission
    await this.pageAccessService.validateCanEdit(movedPage, user);

    // If moving to a new parent, check permission on the target parent
    if (dto.parentPageId && dto.parentPageId !== movedPage.parentPageId) {
      const targetParent = await this.pageRepo.findById(dto.parentPageId);
      if (!targetParent || targetParent.deletedAt) {
        throw new NotFoundException('Target parent page not found');
      }
      await this.pageAccessService.validateCanEdit(targetParent, user);
    }

    return this.pageService.movePage(dto, movedPage);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/breadcrumbs')
  async getPageBreadcrumbs(@Body() dto: PageIdDto, @AuthUser() user: User) {
    const page = await this.pageRepo.findById(dto.pageId);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    await this.pageAccessService.validateCanView(page, user);

    return this.pageService.getPageBreadCrumbs(page.id);
  }

  /*
   * AltWiki bulk page operations. Each item is delegated to the matching
   * single-page handler above so upstream permission checks (space ability +
   * page-level permissions), audit logging and side effects stay identical.
   * Failures are counted per item instead of aborting the batch.
   */
  private async runBulk<T>(
    pageIds: string[],
    op: (pageId: string) => Promise<T>,
    label: string,
  ): Promise<{ success: number; failed: number; results: T[] }> {
    let success = 0;
    let failed = 0;
    const results: T[] = [];
    for (const pageId of pageIds) {
      try {
        results.push(await op(pageId));
        success++;
      } catch (err: any) {
        failed++;
        this.logger.warn(`Bulk ${label} failed for page ${pageId}: ${err?.message}`);
      }
    }
    return { success, failed, results };
  }

  @HttpCode(HttpStatus.OK)
  @Post('bulk/delete')
  async bulkDelete(
    @Body() dto: BulkDeletePagesDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const { success, failed } = await this.runBulk(
      dto.pageIds,
      (pageId) =>
        this.delete(
          { pageId, permanentlyDelete: dto.permanentlyDelete ?? false },
          user,
          workspace,
        ),
      'delete',
    );
    return { success, failed };
  }

  @HttpCode(HttpStatus.OK)
  @Post('bulk/move')
  async bulkMove(@Body() dto: BulkMovePagesDto, @AuthUser() user: User) {
    const { success, failed } = await this.runBulk(
      dto.pageIds,
      async (pageId) => {
        const page = await this.pageRepo.findById(pageId);
        if (!page) throw new NotFoundException('Page not found');

        if (dto.spaceId && dto.spaceId !== page.spaceId) {
          return this.movePageToSpace({ pageId, spaceId: dto.spaceId }, user);
        }
        if (dto.parentPageId !== undefined) {
          const parentPageId = dto.parentPageId || null;
          const position = await this.pageService.nextPagePosition(
            page.spaceId,
            parentPageId ?? undefined,
          );
          return this.movePage({ pageId, parentPageId, position }, user);
        }
      },
      'move',
    );
    return { success, failed };
  }

  @HttpCode(HttpStatus.OK)
  @Post('bulk/restore')
  async bulkRestore(
    @Body() dto: BulkRestorePagesDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const { success, failed } = await this.runBulk(
      dto.pageIds,
      (pageId) => this.restore({ pageId }, user, workspace),
      'restore',
    );
    return { success, failed };
  }

  @HttpCode(HttpStatus.OK)
  @Post('bulk/duplicate')
  async bulkDuplicate(
    @Body() dto: BulkDuplicatePagesDto,
    @AuthUser() user: User,
  ) {
    const { success, failed, results } = await this.runBulk(
      dto.pageIds,
      (pageId) => this.duplicatePage({ pageId, spaceId: dto.spaceId }, user),
      'duplicate',
    );
    return { success, failed, duplicatedPages: results };
  }
}
