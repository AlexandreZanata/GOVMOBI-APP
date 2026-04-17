# govmob-backend

Backend da aplicação GovMob, construído com [NestJS](https://nestjs.com/).

## Requisitos

- Node.js >= 24
- pnpm >= 10
- Docker

## Instalação

```bash
pnpm install
```

## Execução

```bash
# desenvolvimento
pnpm run start:dev

# produção
pnpm run start:prod
```

## Testes

```bash
# unitários
pnpm run test

# e2e
pnpm run test:e2e

# cobertura
pnpm run test:cov
```

## Docker

```bash
# build da imagem
docker build -t govmob-backend .

# execução
docker run -p 3000:3000 govmob-backend
```

## CI/CD

O projeto utiliza GitHub Actions para versionamento SemVer automático e publicação da imagem Docker no GitHub Packages.

### Workflows

- **CI** (`ci-cd.yml`): Executado em PRs — lint, build, testes e build Docker
- **Release** (`release.yml`): Executado no push para `main` — versionamento SemVer e publicação da imagem

### Conventional Commits

O projeto segue o padrão [Conventional Commits](https://www.conventionalcommits.org/). As mensagens de commit devem seguir o formato:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Tipos principais:**

| Tipo          | Descrição                           | Versão        | Seção             |
| ------------- | ----------------------------------- | ------------- | ----------------- |
| `feat`        | Nova funcionalidade                 | Minor         | ✨ NOVIDADES      |
| `fix`         | Correção de bug                     | Patch         | 🐛 CORREÇÕES      |
| `perf`        | Melhoria de performance             | Patch         | ⚡ PERFORMANCE    |
| `deprecated`  | Funcionalidade depreciada           | Minor         | 👎 DEPRECIADO     |
| `removed`     | Funcionalidade removida             | Major         | 🚧 REMOVIDO       |
| `BREAKING`    | Mudança incompatível                | Major         | ⚠️ BREAKING       |
| `docs`        | Documentação                        | Patch         | 📚 DOCUMENTAÇÃO   |
| `style`       | Formatação, sem alteração de lógica | Patch         | 🎨 ESTILO         |
| `refactor`    | Refatoração de código               | Patch         | ♻️ REFACTOR       |
| `build`       | Build, dependências                 | Patch         | 🔧 BUILD          |
| `ci`          | CI/CD, pipelines                    | Patch         | 🚀 CI/CD          |
| `test`        | Testes                              | —             | 🧪 TESTES         |
| `lint`        | Linting                             | —             | —                 |
| `chore`       | Manutenção, sem alteração de código | —             | 📦 OUTROS         |

**Regras de versionamento:**

- `BREAKING CHANGE` no corpo do commit → **Major**
- `type: removed` → **Major**
- `type: feat` ou `type: deprecated` → **Minor**
- `type: fix`, `perf`, `docs`, `style`, `refactor`, `build`, `ci` → **Patch**
- `type: test`, `lint`, `chore` → **Sem release**

**Exemplos:**

```
feat(auth): add JWT refresh token support

fix(api): correct pagination offset calculation

BREAKING CHANGE: database schema migration required
```

### Versionamento e publicação

Ao fazer push na `main`, o `semantic-release`:

1. Analisa os commits para determinar a próxima versão (SemVer)
2. Atualiza `package.json` e gera `CHANGELOG.md`
3. Cria um Git tag e GitHub Release
4. Build e push da imagem Docker com as tags `latest` e `<version>` no GitHub Packages

**Imagem Docker:** `ghcr.io/<owner>/govmob-backend:<version>`

### Configuração necessária

A workflow utiliza o `GITHUB_TOKEN` gerado automaticamente pelo GitHub Actions. Certifique-se de que as permissões do repositório estejam configuradas em **Settings > Actions > General**:

- **Workflow permissions**: `Read and write permissions`

Nenhuma secret adicional é necessária.
