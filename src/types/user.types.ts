import { Usuario } from '@prisma/client';

export type UserCreateInput = Pick<
  Usuario,
  | 'id'
  | 'primeiroNome'
  | 'sobrenome'
  | 'email'
  | 'senha'
  | 'dataNascimento'
  | 'funcao'
  | 'escolaridade'
  | 'areaDeInteresse'
  | 'objetivoNaPlataforma'
  | 'instituicaoId'
>;
