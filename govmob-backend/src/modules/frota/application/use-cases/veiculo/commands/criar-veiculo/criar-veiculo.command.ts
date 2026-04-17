export class CriarVeiculoCommand {
  constructor(
    public readonly props: { placa: string; modelo: string; ano: number },
  ) {}
}
