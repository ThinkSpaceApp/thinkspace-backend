import { IsEmail, IsNotEmpty, Matches, MinLength, IsDateString } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'O primeiro nome é obrigatório.' })
  firstName!: string;

  @IsNotEmpty({ message: 'O sobrenome é obrigatório.' })
  lastName: string | undefined;

  @IsEmail({}, { message: 'O email deve ser válido.' })
  email: string | undefined;

  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres.' })
  @Matches(/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: 'A senha deve conter pelo menos uma letra maiúscula, uma letra minúscula, um número e um caractere especial.',
  })
  password!: string;

  @IsNotEmpty({ message: 'A confirmação de senha é obrigatória.' })
  confirmPassword!: string;

  @IsNotEmpty({ message: 'A data de nascimento é obrigatória.' })
  @IsDateString({}, { message: 'A data de nascimento deve estar no formato ISO (YYYY-MM-DD).' })
  birthDate!: string;
}
