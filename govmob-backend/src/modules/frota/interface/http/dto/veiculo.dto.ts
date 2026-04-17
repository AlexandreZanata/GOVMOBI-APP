import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  Min,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateVeiculoDto {
  @ApiProperty({ example: 'ABC1D23', description: 'Placa do veículo' })
  @IsString()
  @MaxLength(7)
  placa: string;

  @ApiProperty({ example: 'Toyota Corolla', description: 'Modelo do veículo' })
  @IsString()
  modelo: string;

  @ApiProperty({ example: 2024, description: 'Ano de fabricação' })
  @IsNumber()
  @Min(1900)
  ano: number;
}

export class UpdateVeiculoDto {
  @ApiPropertyOptional({ example: 'Toyota Corolla XE' })
  @IsOptional()
  @IsString()
  modelo?: string;

  @ApiPropertyOptional({ example: 2025 })
  @IsOptional()
  @IsNumber()
  @Min(1900)
  ano?: number;
}
