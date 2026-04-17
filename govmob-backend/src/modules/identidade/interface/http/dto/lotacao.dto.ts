import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateLotacaoDto {
  @ApiProperty({
    example: 'Secretaria de Fazenda',
    description: 'Nome da lotação/unidade',
  })
  @IsString()
  nome: string;
}

export class UpdateLotacaoDto {
  @ApiPropertyOptional({
    example: 'Secretaria de Planejamento',
    description: 'Novo nome da lotação',
  })
  @IsOptional()
  @IsString()
  nome?: string;
}
