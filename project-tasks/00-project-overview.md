# Node-RED AI Workflow Orchestrator – Project Overview

_Last updated: 2025-07-02_

Welcome!  This document is the single‐page orientation guide for new contributors (human or AI) to quickly understand the **node-red-contrib-ai-sombrero** codebase and get productive immediately.

---

## 1. Mission Statement
Provide a modular toolkit for building AI-powered automation flows in [Node-RED](https://nodered.org/).  It includes:
* Plug-and-play nodes for interacting with Large Language Models (LLMs) and databases.
* An intelligent **MCP** switch for dynamic routing based on AI or rule logic.
* Shared utilities (prompt enhancer, role manager, DB helper) to avoid duplication.

---

## 2. Core Nodes
| Node | Folder | Purpose |
|------|--------|---------|
| **DB-Config** | `nodes/dbconfig-node` | Stores DB connection info (Postgres, MySQL, SQLite). |
| **LLM-Config** | `nodes/llm-config` | Holds API keys / settings for OpenAI, Anthropic, etc. |
| **LLM-Connector** | `nodes/llm-connector` | Calls an LLM, optionally under a selected **Role Identity**. |
| **MCP Node** | `nodes/mcp-node` | Multi-criteria router.  Upcoming feature: *expert classification* via LLM. |
| **Prompt Enhancer** | `shared/prompt-enhancer` | Service that rewrites/optimises prompts using templates. |

> All heavy logic lives in small, reusable helper modules; the Node files act as thin managers (≈200 lines) – see `upfront-rules.txt` for architectural rails.

---

## 3. Shared Services & Helpers
* `shared/db-config-utils/` – DB connection pool + query helpers.
* `shared/role-manager/` (coming soon) – CRUD for `roles` table.
* `shared/prompt-enhancer/templates/role.hbs` – improves role descriptions.
* `shared/prompt-enhancer/templates/classifier.hbs` – creates expert-classifier prompts for MCP.

---

## 4. Development Status (v0.2.2)
✔️ DB-Config persistence & validation fixed (SQLite support).  
✔️ LLM-Connector & MCP share DB/LLM config dropdowns.  
⬜ **Checkpoint A (next):** roles table + CRUD util (see Action Plan).

For the detailed roadmap read:
* `project-tasks/99-llm-connector-and-mcp-design.md` – Functional design doc.  
* `project-tasks/99.5-action-plan.md` – Checkpoint deliverables.

---

## 5. Repository Layout (excerpt)
```text
nodes/                 # Thin Node-RED node managers
shared/                # Reusable libraries (DB, prompt enhancer, role manager)
services/              # Cross-node runtime services (audit, queue, etc.)
project-tasks/         # Design & task docs (this file, 99*, etc.)
docs/                  # Additional long-form docs
```
Refer to `upfront-rules.txt` for full scaffolding guideline.

---

## 6. Local Setup
```bash
# 1. Install package into local Node-RED userDir (~/.node-red)
npm install /path/to/node-red-contrib-ai-sombrero-<version>.tgz

# 2. Start Node-RED (from userDir)
node-red

# 3. Run tests (from repo root)
npm test
```
Requires Node.js ≥ 20 & a running Postgres (see `docker-compose.db.yml`) or SQLite file.

---

## 7. Key Documents
* **README.md** – Quick start, publishing, contributing.
* **Node-RED AI Workflow Orchestration – Implementation Plan.md** – Original, verbose blueprint.
* **Startingpoint.txt** – Historical scratchpad; useful context.
* **upfront-rules.txt** – Mandatory architectural rules (thin managers, helper modules, etc.).

---

## 8. How to Contribute
1. Skim this overview then open `99.5-action-plan.md` to pick the next checkpoint task.  
2. Create a feature branch (e.g. `feat/roles-checkpoint-a`).  
3. Follow *upfront rules* when adding code (helpers first, thin node manager second).  
4. Run tests & lint, then open a PR.

---

## 9. Contact & Support
Questions? Open a GitHub issue or contact the maintainers listed in `package.json`.

Happy coding!  🎩🤖
