export class CriarMotoristaCommand {
  constructor(
    public readonly props: {
      servidorId: string;
      municipioId: string;
      cnhNumero: string;
      cnhCategoria: string;
    },
  ) {}
}
