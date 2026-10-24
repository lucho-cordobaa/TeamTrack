import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateSetDto } from './update-set.dto';

export class FinishSessionDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSetDto)
  series_completadas?: UpdateSetDto[];
}
