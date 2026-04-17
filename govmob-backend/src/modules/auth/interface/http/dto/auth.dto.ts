import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '00000000000' })
  @IsString()
  @IsNotEmpty()
  @Length(11, 11)
  cpf: string;

  @ApiProperty({ example: 'GovMob@2026' })
  @IsString()
  @IsNotEmpty()
  senha: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'Fulano de Tal' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({ example: '12345678901' })
  @IsString()
  @IsNotEmpty()
  @Length(11, 11)
  cpf: string;

  @ApiProperty({ example: 'fulano@servidor.gov.br' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '11999999999' })
  @IsString()
  @IsNotEmpty()
  telefone: string;

  @ApiProperty({ example: 'uuid-do-cargo' })
  @IsString()
  @IsOptional()
  cargoId?: string;

  @ApiProperty({ example: 'uuid-da-lotacao' })
  @IsString()
  @IsOptional()
  lotacaoId?: string;

  @ApiProperty({ example: 'MinhaSenhaSegura' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 20)
  senha: string;
}
