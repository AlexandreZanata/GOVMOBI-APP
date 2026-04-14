# 🌿 Git Workflow — Branching & First Commit

> **Goal:** Establish a professional Git workflow from the beginning with proper branching and commit standards.

---

### STEP 0 — Initial Repository Setup

**Goal:** Keep the repository clean with a proper `.gitignore` and a clear initial commit.

**Commands:**
```bash
git init
touch .gitignore
```

**Add to `.gitignore`:**
```gitignore
node_modules/
build/
dist/
.env
*.log
.idea/
.vscode/
.DS_Store
```

**Remove IDE files if already tracked:**
```bash
git rm -r --cached .idea
```

**Commit:**
```bash
git add .
git commit -m "chore: initial project setup"
```

---

### STEP 1 — Create `develop` Branch

```bash
git checkout main
git pull origin main
git checkout -b develop
git push -u origin develop
```

---

### STEP 2 — Create First Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/project-setup
git push -u origin feature/project-setup
```

---

### STEP 3 — Commit Message Standard

Use **Conventional Commits**:

```text
feat: new feature
fix: bug fix
chore: setup/config
refactor: code improvement
docs: documentation
```

**Example:**
```text
chore: initial project setup
```

**Avoid:**
```text
initial commit
```

---

### STEP 4 — Workflow Summary

```text
main      -> production
develop   -> integration
feature/* -> development
```

---

## ✅ Definition of Done

- `.gitignore` configured
- No unnecessary files tracked
- `develop` branch created
- Feature branch created
- Commit messages standardized
