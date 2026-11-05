import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BulkDeletePagesDto {
    @IsArray()
    @IsNotEmpty()
    pageIds: string[];

    @IsOptional()
    permanentlyDelete?: boolean;
}

export class BulkMovePagesDto {
    @IsArray()
    @IsNotEmpty()
    pageIds: string[];

    @IsOptional()
    @IsString()
    parentPageId?: string;

    @IsOptional()
    @IsString()
    spaceId?: string;
}

export class BulkRestorePagesDto {
    @IsArray()
    @IsNotEmpty()
    pageIds: string[];
}

export class BulkDuplicatePagesDto {
    @IsArray()
    @IsNotEmpty()
    pageIds: string[];

    @IsOptional()
    @IsString()
    spaceId?: string;
}
