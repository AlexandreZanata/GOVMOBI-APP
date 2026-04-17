# Shared Kernel - Domain

Documentação e convenções para os primitivos de domínio nesta pasta.

## Imutabilidade
- Value Objects (VOs) devem ser IMUTÁVEIS: suas propriedades não devem ser alteradas após a criação.
  - Implementações devem retornar estruturas `Readonly`/`Object.freeze` quando apropriado.
  - `getProps()` deve retornar uma lista ordenada e determinística de propriedades que compõem o VO.

- Entidades possuem identidade (`id`) imutável após construção: use `private readonly _id`.

- `AggregateRoot` mantém uma coleção de eventos de domínio internos. A referência à lista é `private readonly` para evitar reatribuição acidental; a classe pode adicionar ou limpar eventos usando os métodos fornecidos.

## Igualdade
- `Entity.equals` deve ser null-safe e comparar identidade pela propriedade `id`.
- `ValueObject.equals` faz comparação estrutural por propriedades retornadas por `getProps()`.
- Para comparações de tipo, prefira `this.constructor === other.constructor` em vez de `instanceof` quando desejar robustez contra múltiplas cópias do módulo.

## DomainEvent
- `DomainEvent<TAggregateId = unknown>` é parametrizado para permitir tipagem forte do `aggregateId`.
- Campos esperados: `aggregateId`, `occurredOn`, `eventType`, `version`.

## Export
- O arquivo `index.ts` reexporta os símbolos públicos.

## Linters e testes
- Antes de commitar, execute `pnpm run lint` e `pnpm -s tsc --noEmit` (ou `npx tsc --noEmit`) e `pnpm test`.


