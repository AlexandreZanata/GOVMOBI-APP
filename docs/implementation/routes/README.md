# Route Implementation Guides

Each file in this folder covers one domain end-to-end: API reference, file map, and step-by-step implementation instructions.

> **Base URL for all routes:** `http://172.19.2.116:3000` — configure via `API_BASE_URL` env var.
> All responses use the `{ success, data, timestamp }` envelope — unwrap `.data` in every facade.
> **Exception:** `/auth/login` and `/auth/refresh` return `{ accessToken, refreshToken }` directly — no envelope.

| File                                                       | Domain                 | Route               |
|------------------------------------------------------------|------------------------|---------------------|
| [`route-auth.md`](./route-auth.md)                         | Autenticação           | `/auth`             |
| [`route-corridas.md`](./route-corridas.md)                 | Corridas               | `/corridas`         |
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

1. `route-auth.md` — must be working before any authenticated route can be tested
2. `route-corridas.md` — core mobile feature; depends on auth, motoristas, and veículos
3. `route-admin-shell.md` — shell must exist before any page is visible
3. `route-cargos.md` — establishes the envelope unwrap pattern
4. `route-lotacoes.md` — identical pattern to Cargos, fast to implement
5. `route-servidores.md` — depends on Cargos and Lotações (foreign keys)
6. `route-frota-motoristas.md` — depends on Servidores (`servidorId`) and adds status flow
7. `route-frota-veiculos.md` — note: soft-delete is PATCH /desativar, not DELETE
8. `route-users.md`
9. `route-departments.md`
10. `route-audit.md` — read-only, implement last
