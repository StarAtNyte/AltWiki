import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ChangePageOwnerDto {
  @IsString()
  @IsNotEmpty()
  pageId: string;

  @IsUUID()
  userId: string;

  @IsOptional()
  @IsBoolean()
  includeSubpages?: boolean;
}
