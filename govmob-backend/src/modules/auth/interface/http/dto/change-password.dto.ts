import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'CPF_OU_SENHA_ANTIGA',
    description: 'Senha atual (ou CPF se for o primeiro acesso)',
  })
  @IsString()
  senhaAntiga: string;

  @ApiProperty({
    example: 'NovaSenha@2026',
    description: 'Nova senha desejada',
  })
  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter pelo menos 6 caracteres' })
  novaSenha: string;
}
