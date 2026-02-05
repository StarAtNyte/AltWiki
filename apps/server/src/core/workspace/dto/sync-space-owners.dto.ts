import { IsOptional, IsUUID } from 'class-validator';

export class SyncSpaceOwnersDto {
  @IsOptional()
  @IsUUID()
  spaceId?: string; // If provided, sync only this space. Otherwise sync all spaces.
}
