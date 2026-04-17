import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsNumber,
  IsLatitude,
  IsLongitude,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class SolicitarCorridaDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID do Passageiro (Servidor)',
  })
  @IsUUID('7')
  passageiroId: string;

  @ApiProperty({ example: -2.529, description: 'Latitude de origem' })
  @IsNumber()
  @IsLatitude()
  origemLat: number;

  @ApiProperty({ example: -44.301, description: 'Longitude de origem' })
  @IsNumber()
  @IsLongitude()
  origemLng: number;

  @ApiProperty({ example: -2.535, description: 'Latitude de destino' })
  @IsNumber()
  @IsLatitude()
  destinoLat: number;

  @ApiProperty({ example: -44.295, description: 'Longitude de destino' })
  @IsNumber()
  @IsLongitude()
  destinoLng: number;

  @ApiProperty({
    example: 'Visita técnica ao canteiro de obras',
    description: 'Motivo do deslocamento',
  })
  @IsString()
  @MaxLength(200)
  motivoServico: string;

  @ApiPropertyOptional({
    example: 'Levar material de medição',
    description: 'Informações adicionais',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;
}
