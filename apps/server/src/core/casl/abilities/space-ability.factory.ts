import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import {
  SpaceRole,
  SpaceVisibility,
} from '../../../common/helpers/types/permission';
import { User } from '@docmost/db/types/entity.types';
import { SpaceMemberRepo } from '@docmost/db/repos/space/space-member.repo';
import {
  SpaceCaslAction,
  ISpaceAbility,
  SpaceCaslSubject,
} from '../interfaces/space-ability.type';
import { findHighestUserSpaceRole } from '@docmost/db/repos/space/utils';
import { CacheOptions } from '../../../common/helpers/with-cache';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';

export type SpaceAbilityOptions = CacheOptions & {
  // AltWiki: caller-supplied visibility (already loaded, workspace-scoped space)
  spaceVisibility?: string;
};

@Injectable()
export default class SpaceAbilityFactory {
  constructor(
    private readonly spaceMemberRepo: SpaceMemberRepo,
    @InjectKysely() private readonly db: KyselyDB,
  ) {}

  async createForUser(
    user: User,
    spaceId: string,
    opts?: SpaceAbilityOptions,
  ) {
    const userSpaceRoles = await this.spaceMemberRepo.getUserSpaceRoles(
      user.id,
      spaceId,
      opts,
    );

    const userSpaceRole = findHighestUserSpaceRole(userSpaceRoles);

    switch (userSpaceRole) {
      case SpaceRole.ADMIN:
        return buildSpaceAdminAbility();
      case SpaceRole.WRITER:
        return buildSpaceWriterAbility();
      case SpaceRole.READER:
        return buildSpaceReaderAbility();
      default: {
        // Caller already knows the visibility (e.g. space controller) — use it directly.
        // Otherwise fetch it. This query only runs for non-members.
        const visibility =
          opts?.spaceVisibility ??
          (
            await this.db
              .selectFrom('spaces')
              .select('visibility')
              .where('id', '=', spaceId)
              // AltWiki: OPEN = visible to authenticated members of the same
              // workspace only (not anonymous; upstream public spaces use the
              // separate public_spaces table). Never applies to personal spaces.
              .where('workspaceId', '=', user.workspaceId)
              .where('isPersonal', '=', false)
              .where('deletedAt', 'is', null)
              .executeTakeFirst()
          )?.visibility;

        if (visibility === SpaceVisibility.OPEN) {
          return buildSpaceReaderAbility();
        }
        throw new NotFoundException('Space permissions not found');
      }
    }
  }
}

function buildSpaceAdminAbility() {
  const { can, build } = new AbilityBuilder<MongoAbility<ISpaceAbility>>(
    createMongoAbility,
  );
  can(SpaceCaslAction.Manage, SpaceCaslSubject.Settings);
  can(SpaceCaslAction.Manage, SpaceCaslSubject.Member);
  can(SpaceCaslAction.Manage, SpaceCaslSubject.Page);
  can(SpaceCaslAction.Manage, SpaceCaslSubject.Share);
  return build();
}

function buildSpaceWriterAbility() {
  const { can, build } = new AbilityBuilder<MongoAbility<ISpaceAbility>>(
    createMongoAbility,
  );
  can(SpaceCaslAction.Read, SpaceCaslSubject.Settings);
  can(SpaceCaslAction.Read, SpaceCaslSubject.Member);
  can(SpaceCaslAction.Manage, SpaceCaslSubject.Page);
  can(SpaceCaslAction.Manage, SpaceCaslSubject.Share);
  return build();
}

function buildSpaceReaderAbility() {
  const { can, build } = new AbilityBuilder<MongoAbility<ISpaceAbility>>(
    createMongoAbility,
  );
  can(SpaceCaslAction.Read, SpaceCaslSubject.Settings);
  can(SpaceCaslAction.Read, SpaceCaslSubject.Member);
  can(SpaceCaslAction.Read, SpaceCaslSubject.Page);
  can(SpaceCaslAction.Read, SpaceCaslSubject.Share);
  return build();
}
