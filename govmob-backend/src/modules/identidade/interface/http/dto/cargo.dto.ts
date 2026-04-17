import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class CreateCargoDto {
  @ApiProperty({ example: 'Auditor Fiscal', description: 'Nome do cargo' })
  @IsString()
  nome: string;

  @ApiProperty({
    example: 80,
    description: 'Peso de prioridade do cargo (0-100)',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  pesoPrioridade: number;
}

export class UpdateCargoDto {
  @ApiPropertyOptional({
    example: 'Auditor Fiscal Senior',
    description: 'Novo nome do cargo',
  })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiPropertyOptional({ example: 90, description: 'Novo peso de prioridade' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  pesoPrioridade?: number;
}
