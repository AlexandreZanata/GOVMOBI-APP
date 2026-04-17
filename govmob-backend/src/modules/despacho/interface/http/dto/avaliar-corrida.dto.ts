import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max, IsString, IsOptional, MaxLength } from 'class-validator';

export class AvaliarCorridaDto {
  @ApiProperty({ description: 'Nota de 1 a 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  public readonly nota: number;

  @ApiProperty({ description: 'Comentário opcional', required: false, maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  public readonly comentario?: string;
}
