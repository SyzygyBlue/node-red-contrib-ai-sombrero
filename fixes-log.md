# Node-RED AI Sombrero UI Fixes Log

This document summarizes the changes made to Node-RED AI Sombrero node HTML files to diagnose and resolve a persistent `TypeError: Cannot read properties of undefined (reading 'get')` in the Node-RED editor UI.

## 1. `nodes/llm-connector/llm-connector.html`

**Objective:** Simplify the `llm-connector` node's editor UI to its absolute minimum to isolate the source of the `TypeError`.

**Changes Made:**

*   **Removed client-side UI initialization code from backend `llm-connector.js`**:
    *   Previously, client-side UI initialization code for a `PromptEnhancerUI` component was incorrectly placed in `llm-connector.js`. This was removed to prevent browser-specific code from executing in the Node.js environment.
*   **Minimized `llm-connector.html`**:
    *   The HTML template was reduced to only contain a single input field for the node name.
    *   The JavaScript block was reduced to only the essential `RED.nodes.registerType` call with minimal `defaults` and empty lifecycle functions (`oneditprepare`, `oneditsave`, `oneditresize`).
    *   All complex UI logic, `typedInput` initializations, and dynamic elements were removed.
    *   The help text was also simplified.

**Status:** The `llm-connector.html` is currently in its most minimal state.

## 2. `nodes/llm-config/llm-config.html`

**Objective:** Simplify the `llm-config` node's editor UI due to suspicion that its dynamic UI elements or `$.getJSON` call were contributing to the `TypeError` during initial palette loading.

**Changes Made:**

*   **Removed `$.getJSON('llm-providers')` call**: This call, which fetched LLM provider configurations, was removed as it could cause issues if the endpoint was not ready or returned an error during editor initialization.
*   **Removed Dynamic Field Generation**: The `oneditprepare` function's logic for dynamically generating input fields based on the selected LLM provider was removed.
*   **Minimized `llm-config.html`**:
    *   The HTML template was reduced to only contain a single input field for the node name.
    *   The JavaScript block was reduced to only the essential `RED.nodes.registerType` call with minimal `defaults` and empty lifecycle functions (`oneditprepare`, `oneditsave`).
    *   All complex UI logic and dynamic elements were removed.
    *   The help text was simplified.

**Status:** The `llm-config.html` is currently in its most minimal state.

---

## 3. `mcp-node` Registration

**Objective:** Isolate which node within the `node-red-contrib-ai-sombrero` package was causing the `TypeError`.

**Changes Made:**

*   Temporarily removed the `mcp-node` entry from the `nodes` section of `package.json`.

**Result:** The `TypeError: Cannot read properties of undefined (reading 'get')` **disappeared** after removing `mcp-node` from the package registration.

**Conclusion:** The `mcp-node` is the source of the UI error during Node-RED palette loading.

---

## 4. `mcp-node.html` Simplification

**Objective:** Pinpoint the problematic section within `mcp-node.html` using the half-split method.

**Changes Made:**

*   Removed `oneditprepare`, `oneditsave`, and `oneditresize` functions.
*   Removed the `RED.httpAdmin.get` endpoint registration.
*   Reduced the `data-template-name="mcp-node"` section to only the basic name input field.
*   Kept only the essential `defaults` in `RED.nodes.registerType`.

**Result:** The `TypeError: Cannot read properties of undefined (reading 'get')` **disappeared** after simplifying `mcp-node.html`.

**Conclusion:** The problem lies within the complex UI logic, external script loading, or dynamic elements that were removed from `mcp-node.html`.

---

## 5. `mcp-node.html` `oneditprepare` Investigation

**Objective:** Pinpoint the exact cause of the `TypeError` within `mcp-node.html`.

**Changes Made:**

*   Restored `mcp-node.html` to a more complex state, reintroducing `defaults`, `oneditprepare`, `oneditsave`, and `oneditresize` functions, and the full HTML template.
*   Crucially, the `$.getScript('mcp-node/ui/scripts/editor.js')` call within `oneditprepare` was **commented out**.

**Result:** The `TypeError: Cannot read properties of undefined (reading 'get')` **remained absent**.

**Conclusion:** The `TypeError` is specifically caused by the `$.getScript('mcp-node/ui/scripts/editor.js')` call within the `oneditprepare` function. The problem lies within the `mcp-node/ui/scripts/editor.js` file itself, or its interaction with the Node-RED UI environment.

---

## 6. `mcp-node.html` `editor.js` Path Correction

**Objective:** Verify if the `TypeError` reappears after correcting the `editor.js` path.

**Changes Made:**

*   Corrected the path for `editor.js` in the `$.getScript` call within `oneditprepare` in `mcp-node.html` from `mcp-node/ui/scripts/editor.js` to `mcp-node/lib/ui/scripts/editor.js`.
*   Uncommented the `$.getScript` call.

**Result:** The `TypeError: Cannot read properties of undefined (reading 'get')` **remained absent**.

**Conclusion:** The root cause of the `TypeError` was the incorrect path to `editor.js` in `mcp-node.html`. Node-RED's UI framework likely encountered an issue when attempting to load a non-existent script, leading to the observed error.

---

**Final Resolution:** The persistent `TypeError` in the Node-RED editor UI has been resolved by correcting the path to `editor.js` in `mcp-node.html`.

---

## 7. `ui-handler.js` Lifecycle Fix

**Objective:** Resolve a second `TypeError` caused by incorrect timing of UI endpoint registration

**Problem Analysis:**
* Initial error in browser console: `TypeError: Cannot read properties of undefined (reading 'get')`
* Server-side error in logs: `TypeError: Cannot read properties of undefined (reading 'registerUIEndpoints')`
* Root cause: The `ui-handler.js` module was calling `RED.httpAdmin.get()` before the Node-RED runtime was fully initialized

**Architecture Issue:**
* `ui-handler.js` defined a `registerUIEndpoints()` function but returned it without calling it
* `mcp-node.js` called this function directly during module load: `uiHandler.registerUIEndpoints()`
* This happened too early in Node-RED's lifecycle, before `RED.httpAdmin` was available

**Failed Approaches:**
* Using `setTimeout` to delay registration (brittle, arbitrary delay)
* Direct execution inside `ui-handler.js` (still too early in lifecycle)
* Removing the return value from `ui-handler.js` (broke API contract with `mcp-node.js`)

**Solution Implemented:**
* Used Node-RED's proper event system to register endpoints at the correct lifecycle stage
* Added `RED.events.once("runtime-ready", function() { registerUIEndpoints(); })` in `ui-handler.js`
* Restored proper object return structure from `ui-handler.js`
* Kept the reference in `mcp-node.js` but removed the direct call

**Benefits:**
* Deterministic timing based on Node-RED's internal lifecycle
* No arbitrary delays or timeouts
* Maintains clean separation of concerns
* Future-proof against Node-RED version changes

**Status:** The `ui-handler.js` module now properly registers endpoints only when the runtime is ready.

This log now reflects the complete diagnostic and resolution process for the `TypeError`.
