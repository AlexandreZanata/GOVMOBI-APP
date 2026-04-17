import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsNumber,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsEnum,
} from 'class-validator';

export class AceitarCorridaDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('7')
  motoristaId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('7')
  veiculoId: string;
}

export class RecusarCorridaDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('7')
  motoristaId: string;

  @ApiPropertyOptional({ example: 'Muito longe' })
  @IsOptional()
  @IsString()
  motivo?: string;
}

export class MotoristaCorridaDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('7')
  motoristaId: string;
}

export class ConfirmarEmbarqueDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('7')
  motoristaId: string;

  @ApiProperty({ example: -2.529 })
  @IsNumber()
  @IsLatitude()
  posicaoLat: number;

  @ApiProperty({ example: -44.301 })
  @IsNumber()
  @IsLongitude()
  posicaoLng: number;
}

export class FinalizarCorridaDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('7')
  motoristaId: string;

  @ApiProperty({ example: -2.535 })
  @IsNumber()
  @IsLatitude()
  posicaoFinalLat: number;

  @ApiProperty({ example: -44.295 })
  @IsNumber()
  @IsLongitude()
  posicaoFinalLng: number;
}

export class CancelarCorridaDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('7')
  solicitanteId: string;

  @ApiProperty({ example: 'Mudança de planos' })
  @IsString()
  motivo: string;

  @ApiProperty({ enum: ['passageiro', 'motorista', 'admin'] })
  @IsEnum(['passageiro', 'motorista', 'admin'])
  tipoSolicitante: 'passageiro' | 'motorista' | 'admin';
}
