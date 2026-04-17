export enum Papel {
  USUARIO = 'USUARIO',
  ADMIN = 'ADMIN',
}

export const PapeisValidos = Object.values(Papel);

export function isPapelValido(papel: string): papel is Papel {
  return PapeisValidos.includes(papel as Papel);
}
