# Route Implementation Guides

Each file in this folder covers one domain end-to-end: API reference, file map, and step-by-step implementation instructions.

> **Base URL for all routes:** `http://172.19.2.116:3000` — configure via `NEXT_PUBLIC_API_URL` env var.
> All responses use the `{ success, data, timestamp }` envelope — unwrap `.data` in every facade.

| File                                                       | Domain                 | Route               |
|------------------------------------------------------------|------------------------|---------------------|
| [`route-admin-shell.md`](./route-admin-shell.md)           | Layout / Navigation    | All `(admin)/*`     |
| [`route-cargos.md`](./route-cargos.md)                     | Cargos                 | `/cargos`           |
| [`route-lotacoes.md`](./route-lotacoes.md)                 | Lotações               | `/lotacoes`         |
| [`route-servidores.md`](./route-servidores.md)             | Servidores             | `/servidores`       |
| [`route-frota-motoristas.md`](./route-frota-motoristas.md) | Frota / Motoristas     | `/frota/motoristas` |
| [`route-frota-veiculos.md`](./route-frota-veiculos.md)     | Frota / Veículos       | `/frota/veiculos`   |
| [`route-users.md`](./route-users.md)                       | Users (internal)       | `/users`            |
| [`route-departments.md`](./route-departments.md)           | Departments (internal) | `/departments`      |
| [`route-audit.md`](./route-audit.md)                       | Audit Trail (internal) | `/audit`            |

## Recommended implementation order

1. `route-admin-shell.md` — shell must exist before any page is visible
2. `route-cargos.md` — establishes the envelope unwrap pattern
3. `route-lotacoes.md` — identical pattern to Cargos, fast to implement
4. `route-servidores.md` — depends on Cargos and Lotações (foreign keys)
5. `route-frota-motoristas.md` — depends on Servidores (`servidorId`) and adds status flow
6. `route-frota-veiculos.md` — note: soft-delete is PATCH /desativar, not DELETE
7. `route-users.md`
8. `route-departments.md`
9. `route-audit.md` — read-only, implement last
