export class EditarVeiculoCommand {
  constructor(
    public readonly props: { id: string; modelo?: string; ano?: number },
  ) {}
}
