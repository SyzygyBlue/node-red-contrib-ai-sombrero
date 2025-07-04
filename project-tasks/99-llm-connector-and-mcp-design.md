# LLM Connector & MCP Node – Enhanced Design and Next-Step Roadmap

_Last updated: 2025-07-02_

## 1. Purpose
This document formalises the remaining design work for integrating **Role/Identity management** into the **LLM-Connector** node and aligning **MCP** node capabilities with shared configuration patterns (LLM Config & DB Config).

The goal is to deliver:
* A seamless UX for selecting or creating roles/identities that shape downstream LLM behaviour.
* A robust persistence model backed by the existing DB-Config node.
* Re-usable UI utilities shared across nodes.
* Parity of shared-config handling between LLM-Connector and MCP nodes.
* Clear test coverage to guard future changes.

---

## 2. Feature Overview & Workflow
1. **Role Field in LLM-Connector**  
   • Read-only text field displaying selected role name.  
   • _Select Role_ button → opens Role Manager dialog.
2. **Role Manager Dialog**  
   • List of existing roles (fetched from DB via shared util).  
   • _Add New_ button → inserts blank editable row.  
   • For each role: _Enhance_ button invokes Prompt-Enhancer pipeline.  
   • Editing a role updates the record in-place (no duplicates) and refreshes list.
3. **Prompt-Enhancer Integration**  
   • Uses **llm-config** selected in LLM-Connector.  
   • Enhancer may be invoked repeatedly; results overwrite the description field.  
   • Disabled if role name/description are empty.
4. **Persistence**  
   • Table `roles (id uuid pk, name text unique, description text, updated_at)`  
   • CRUD operations via `shared/role-manager` util (new).
5. **Reference Storage**  
   • LLM-Connector stores `roleIdentity` = `roles.id`.  
   • On deploy, runtime resolves id → description for message context.
6. **MCP Node Alignment**  
   • MCP node already has LLM/DB dropdowns. Extend runtime to consume them.

---

## 2.1 Standard Message Envelope & Processing Contract

### Envelope Structure
```jsonc
{
  "workId": "<uuid>",           // OPTIONAL – created by first connector if absent
  "roleId": "<uuid>",           // OPTIONAL – defaults to node’s configured role
  "payload": "<string|object>", // REQUIRED – task or data to process
  "units": [ /* envelopes */ ],   // OPTIONAL – added after a split operation
  "meta": {
    "parentSeq": 0,              // index of parent unit, if any
    "attempt": 1,                // retry counter
    "traceId": "<uuid>"
  },
  "llmOptions": { "temperature": 0.7 }, // OPTIONAL per-message overrides
  "_llm": { "provider": "ollama", "model": "llama3:8b", "tokens": 200 }
}
```

### Generation Rules
1. **workId** – if `msg.workId` is missing the node creates `uuid.v4()` before DB insert.
2. **roleId** – if missing the node injects its configured `roleId` and errors if none configured.
3. IDs are persisted in both `jobs` and `work_units` tables.

### Connector Behaviour
* Builds prompt using role description + `payload`.
* Calls LLM; expects JSON array → validates/normalises.
* On success: sets `msg.units = [ envelopes… ]`, stores rows in `work_units`, sets `jobs.status = 'done'`.
* On failure: stores raw response, sets `jobs.status = 'error'`, emits on output 2 with `msg.error`.

### MCP Behaviour
* Accepts identical envelope.
* If `units` present → iterates & routes each.
* If none → classifies/decides based on `payload` and forwards.

### Persistence Schema
```sql
CREATE TABLE jobs (
  job_id       TEXT PRIMARY KEY,
  role_id      TEXT,
  payload      TEXT,
  status       TEXT DEFAULT 'pending',
  attempts     INTEGER DEFAULT 0,
  created_at   INTEGER,
  last_error   TEXT,
  raw_response TEXT
);

CREATE TABLE work_units (
  job_id   TEXT,
  role_id  TEXT,
  seq      INTEGER,
  unit_json TEXT,
  status   TEXT DEFAULT 'ready',
  attempts INTEGER DEFAULT 0,
  processed_at INTEGER,
  last_error TEXT,
  PRIMARY KEY (job_id, role_id, seq)
);
```

### Retry Strategy
A separate Retry flow queries:
```sql
SELECT * FROM jobs WHERE status='error' AND attempts < <maxAttempts>;
```
Re-injects the envelope with `meta.attempt++`. The connector caps retries and moves jobs to `dead` status when exceeded.

---

### MVP vs Future Scope
The first milestone focuses on a lean, test-able flow:
* Single Handlebars template `role.hbs` powers all role enhancements.
* Users cannot add/edit templates via UI; they ship with the module (static resource).
* The new "Enhance" button updates the **description** field in-place; only the role name is kept constant.
* Dynamic template selection, template CRUD UI, and classification-specific templates are explicitly deferred.

These limitations keep surface area low while we validate real usage. If feedback shows a need for user-defined templates, we will design a Template Manager config node in v1.x (see Open Questions).

---

## 3. Detailed Tasks
### 3.1 Database & Back-End
| # | Task | Owner | Notes |
|---|------|-------|-------|
| DB-1 | Create `roles` table migration | DB | Use `shared/db-config-utils` helper. |
| DB-2 | Implement `role-manager` util (CRUD) | BE | Pattern similar to `db-config-utils/index.js`. |
| BE-1 | Expose REST endpoint `/roles` for UI (optional) | BE | Could use Node-RED HTTP-In node. |
| BE-2 | Update LLM-Connector runtime to load role description at start & attach to `msg.role` | BE | Fail-safe if id missing.

### 3.2 UI (Editor) – Shared Components
| # | Task |
|---|------|
| UI-1 | Create `nodes/shared/role-manager/ui.js` for dialog generation & interactions. |
| UI-2 | Add readonly field + _Select Role_ button in `llm-connector.html` (already stubbed). |
| UI-3 | Build Role Manager dialog template (sortable list, add new, enhance). |
| UI-4 | Integrate with Prompt-Enhancer (pass role description to existing enhancer util). |
| UI-5 | Disable _Enhance_ button when name/description empty. |
| UI-6 | Emit change events so Node-RED marks flow dirty → Deploy enabled.

### 3.3 Prompt-Enhancer Integration
1. Accept extra `mode: "role"` flag so enhancer adds role-specific instructions.  
2. Add `mode: "classifier"` that uses `templates/classifier.hbs` for expert classification prompts reused by MCP & other nodes.  
3. Use LLM & DB config from current node context; fallback & error messaging.

### 3.4 MCP Node Enhancements
| # | Task |
|---|------|
| MCP-1 | Runtime: utilise `llmConfig` & `dbConfig` refs for rule evaluation & audit. |
| MCP-2 | Optional: expose Role selection (future) to route using persona. |
| MCP-3 | **Classification Expert** field & _Select Expert_ button in MCP editor, leveraging Role Manager dialog. |
| MCP-4 | Extend Role Manager UI to support classification templates (allowed classes list, guidance text). |
| MCP-5 | Runtime: call LLM via selected expert to output well-formed JSON `{ classification: "a", ... }`. |
| MCP-6 | Inject `classification` into `msg` so downstream Switch node can route on `msg.classification`. |
| MCP-7 | Unit & integration tests for classification flow and JSON schema validity. |

### 3.5 Quality & Testing
* **Unit tests**: CRUD util, prompt enhancer role mode.
* **Integration tests**: End-to-end flow (create role → enhance → save → deploy → runtime sees role).
* **UI tests**: Cypress or Jest-DOM for dialog behaviours.
* **Lint / CI**: extend pipelines to cover new directories.

---

## 4. Risks & Mitigations
* **Dialog complexity** – Keep initial version minimal, iterate.
* **DB schema drift** – Guard with migrations & semantic versioning.
* **LLM quota/latency** – Cache enhancements per role/version.

---

## 5. Acceptance Criteria
1. User can create, edit, enhance, select roles without redeploying flows manually.
2. Enhancements persist and overwrite same role, not duplicate.
3. Deploy button lights up when role selection changes.
4. Runtime nodes access role data via ID.
5. All tests pass in CI.

---

## 6. Implementation Sequence (Checkpoint Gates)
1. **Checkpoint A** – Roles table & CRUD util.  
2. **Checkpoint B** – Dialog UI functional (without enhancer).  
3. **Checkpoint C** – Prompt-Enhancer integration.  
4. **Checkpoint D** – Runtime support & tests.  
5. **Checkpoint E** – MCP runtime alignment.

Each checkpoint requires code review, docs update, and version bump.

---

## 7. Documentation & Training
* Update README & `docs/development-setup.md` with role feature.
* Provide GIF demo and example flow in `/examples`.

---

## 8. Open Questions
1. Should roles be scoped per flow or global?  
2. Versioning strategy for roles (history tracking needed?).  
3. UI look-and-feel – reuse Node-RED table style or custom modal?

---

_end of file_
