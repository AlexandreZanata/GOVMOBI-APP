import { ValueObject } from '../../../../shared-kernel/domain';

interface PoligonoMunicipalProps {
  municipioId: string;
  wktGeometry: string; // Well-Known Text
}

export class PoligonoMunicipal extends ValueObject {
  private readonly _municipioId: string;
  private readonly _wktGeometry: string;

  private constructor(props: PoligonoMunicipalProps) {
    super();
    this._municipioId = props.municipioId;
    this._wktGeometry = props.wktGeometry;
  }

  public static criar(
    municipioId: string,
    wktGeometry: string,
  ): PoligonoMunicipal {
    return new PoligonoMunicipal({ municipioId, wktGeometry });
  }

  get municipioId(): string {
    return this._municipioId;
  }

  get wkt(): string {
    return this._wktGeometry;
  }

  protected getProps(): ReadonlyArray<unknown> {
    return [this._municipioId, this._wktGeometry];
  }
}
