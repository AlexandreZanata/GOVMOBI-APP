import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsUUID,
  IsArray,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateServidorDto {
  @ApiProperty({
    example: 'Manoel Gomes',
    description: 'Nome completo do servidor',
  })
  @IsString()
  nome: string;

  @ApiProperty({
    example: '12345678909',
    description: 'CPF (apenas números, válido)',
  })
  @IsString()
  @MinLength(11)
  @MaxLength(11)
  cpf: string;

  @ApiProperty({
    example: 'manoel@gov.br',
    description: 'E-mail institucional',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '21988887777', description: 'Telefone de contato' })
  @IsString()
  telefone: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID do Cargo',
  })
  @IsUUID('7')
  cargoId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID da Lotação',
  })
  @IsUUID('7')
  lotacaoId: string;

  @ApiProperty({
    example: ['USUARIO'],
    description: 'Lista de papéis atribuídos',
    enum: ['ADMIN', 'USUARIO'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  papeis: string[];

  @ApiPropertyOptional({
    example: 'GovMob@2026',
    description: 'Senha opcional definida pelo administrador',
  })
  @IsString()
  @IsOptional()
  @MinLength(6)
  senha?: string;
}

export class UpdateServidorDto {
  @ApiPropertyOptional({ example: 'Manoel Gomes Alterado' })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiPropertyOptional({ example: '21999991111' })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID('7')
  cargoId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID('7')
  lotacaoId?: string;

  @ApiPropertyOptional({
    example: ['ADMIN'],
    enum: ['ADMIN', 'USUARIO'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  papeis?: string[];
}
