export class EditarMotoristaCommand {
  constructor(
    public readonly props: {
      id: string;
      cnhNumero?: string;
      cnhCategoria?: string;
    },
  ) {}
}
