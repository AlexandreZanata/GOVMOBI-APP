import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsEnum, IsOptional } from 'class-validator';
import { StatusOperacional } from '../../../domain/aggregates/motorista.aggregate';

export class CreateMotoristaDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID do Servidor na Identidade',
  })
  @IsUUID('7', { message: 'servidorId deve ser um UUID v7 válido' })
  servidorId: string;

  @ApiProperty({
    example: 'f0928929-373e-4614-9273-df3092039402',
    description: 'ID do Município',
  })
  @IsUUID()
  municipioId: string;

  @ApiProperty({ example: '1234567890', description: 'Número da CNH' })
  @IsString()
  cnhNumero: string;

  @ApiProperty({
    example: 'AB',
    description: 'Categoria da CNH (A, B, AB, C, D, E)',
  })
  @IsString()
  cnhCategoria: string;
}

export class UpdateMotoristaDto {
  @ApiPropertyOptional({ example: '0987654321' })
  @IsOptional()
  @IsString()
  cnhNumero?: string;

  @ApiPropertyOptional({ example: 'D' })
  @IsOptional()
  @IsString()
  cnhCategoria?: string;
}

export class UpdateStatusMotoristaDto {
  @ApiProperty({
    enum: StatusOperacional,
    example: StatusOperacional.DISPONIVEL,
  })
  @IsEnum(StatusOperacional)
  status: StatusOperacional;
}
