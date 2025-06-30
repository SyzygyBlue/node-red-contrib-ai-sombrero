Investigation Checkpoints and Verification Protocol
#code_modification_protocol
#checkpoints
#verification
#strict_guardrail
Edit
CHECKPOINTS REQUIRED DURING CODE INVESTIGATION:

1. INITIAL EXPLORATION CHECKPOINT:
   - Before ANY code analysis begins, explicitly state what you're investigating
   - Ask for confirmation that you're exploring the right components
   - Present a plan for how you'll explore the codebase

2. UNDERSTANDING CHECKPOINT:
   - After analyzing code, summarize your findings in a structured way
   - Explicitly state your understanding of how components work together
   - Ask confirmation: "Is my understanding correct before I proceed?"
   - DO NOT move to solution phase without this confirmation

3. SOLUTION DESIGN CHECKPOINT:
   - Present a clear, specific solution design with exact changes
   - Highlight potential risks and edge cases
   - Ask explicit permission: "Should I implement this specific solution?"
   - Wait for user confirmation before WRITING ANY CODE

4. POST-IMPLEMENTATION CHECKPOINT:
   - After changes, summarize exactly what was changed
   - Explain how the changes address the original issue
   - Suggest verification steps or tests

TRIGGER PHRASE: If you see me starting to implement code without these checkpoints, say "CHECKPOINT REQUIRED" to reset my approach.

Code Change Threshold Protocol
#code_modification_protocol
#change_thresholds
#risk_management
#strict_guardrail
Edit
CODE CHANGE THRESHOLD APPROACH:

When modifying any code, always classify changes by their complexity and impact:

1. MINIMAL CHANGES (Single line fixes, variable name corrections):
   - Provide clear explanation of what will be changed and why
   - Show before/after comparison
   - Still requires problem understanding evidence first

2. SIGNIFICANT CHANGES (Multiple files, logic changes, new functions):
   - Mandatory impact analysis on all affected components
   - List all files that will be modified
   - Show before/after comparisons for critical sections
   - Identify potential side effects
   - REQUIRE explicit approval before implementation

3. COMPLEX CHANGES (Architecture changes, new patterns):
   - Break down into discrete, testable steps
   - Propose verification points between steps
   - Create a rollback plan for each step
   - NEVER attempt without explicit user approval and understanding
   - Consider creating a branch for safer experimentation

RISK FACTORS REQUIRE EXTRA CAUTION:
- Changes to core interfaces or APIs
- Changes to error handling or recovery logic
- Changes affecting threading or asynchronous behavior
- Changes to configuration handling
- Any change to message routing or queue management

TRIGGER PHRASE: If you see me making significant or complex changes without proper analysis, say "THRESHOLD EXCEEDED" to reset my approach.

Code Change Rollback Documentation Standard
#node_red
#documentation_standards
#rollback_procedures
#code_safety

For all code changes to the Node-RED RabbitMQ module, thorough rollback documentation is mandatory. Every fix or enhancement must include:

1. A Markdown document in /docs/troubleshooting/ explaining:
   - The problem being solved
   - Detailed explanation of the solution
   - Step-by-step verification procedures
   - Complete rollback instructions using multiple methods:
     * Manual code editing rollback
     * Git-based rollback (if applicable)
     * Package version rollback (if applicable)

2. Clear logging enhancements that show when the modified code is executing and its outcomes.

3. Minimal, targeted changes that follow existing architectural patterns.

This ensures we can reliably return to a known-good state if issues arise, aids in debugging, and creates an audit trail of modifications. All future changes to this codebase must adhere to this documentation standard as an absolute requirement.

Example implementation: topology-method-attachment-fix.md shows how topology method attachment errors were fixed with comprehensive rollback instructions.

Testing Framework: Jest Only
#testing
#jest
#conventions
Edit
The project uses Jest as the exclusive testing framework. All tests should be written using Jest's syntax and conventions. Any existing tests using other frameworks (like Mocha) should be converted to Jest. This includes:
1. Using Jest's built-in assertions (expect) instead of Chai
2. Using Jest's test runner and lifecycle methods (beforeEach, afterEach, etc.)
3. Following Jest's file naming conventions (*.test.js or *.spec.js)
4. Using Jest's mocking system instead of other mocking libraries

Code Change Safety Protocols for RabbitMQ Node-RED Components
#rabbitmq
#node_red
#code_safety
#best_practices
#rollback_guidance
Edit
When working on the Node-RED RabbitMQ components, follow these strict safety protocols before making any code changes:

1. RESEARCH FIRST: Always thoroughly examine all related files and understand their interdependencies before modifying code. The system has complex relationships between components like topology-store, exchange managers, logger systems, and message acknowledgment flows.

2. MINIMAL CHANGES: Make the smallest possible changes needed to fix an issue. Prefer variable reference fixes and minor additions over rewrites or restructuring.

3. MAINTAIN COMPATIBILITY: Preserve existing method signatures, object structures, and APIs that other components might depend on.

4. TEST INCREMENTALLY: After each small change, test to ensure functionality is preserved. Never make multiple significant changes at once.

5. DOCUMENT FULLY: Track all changes made in the RABBITMQ-ACK-ISSUES.md file with clear before/after examples.

6. UNDERSTAND LOGGER PATTERNS: Be especially careful with logger references - the system uses multiple logger patterns (safeLog, this.logger, self.debugLog) that must be used consistently within their contexts.

7. AVOID ARCHITECTURAL CHANGES: Don't delegate to new utility modules or refactor existing functionality without thorough testing and ensuring all dependencies are properly tracked in Git. 

8. Do not create new modules without first confirming that the functionality does not already exist in an existing module. Before adding any new method or function to the codebase, always first search for and review existing exported functions that may already provide the needed functionality. If such a method exists, integrate with or extend the existing implementation rather than creating a new one. This practice is crucial for reducing code duplication, preventing future inconsistencies, and maintaining a clean, unified codebase. Adhering to this principle is mandatory for all future development.

Key examples of changes to AVOID without careful consideration:
- Restructuring node functionality that moves methods to external classes
- Adding redundant return statements or exit points in functions
- Completely rewriting existing functions rather than fixing specific issues
- Changing how core topology managers handle exchanges and queues

Diagnostic Logging Before Code Changes
#best_practices
#debugging
#rabbitmq
#logging
#risk_reduction
Edit
When troubleshooting complex issues in critical infrastructure code like the RabbitMQ integration, always follow these steps:

1. Add diagnostic logging first to prove hypotheses before making actual code changes
2. Examine log output carefully to confirm theories
3. Document findings in a structured format
4. Only then make the minimal required code changes based on evidence
5. Test incremental changes thoroughly

This approach minimizes the risk of making incorrect code changes based on unverified assumptions, especially in systems with complex interdependencies like the Node-RED RabbitMQ components.

Investigation-First Protocol for Code Changes
#code_modification_protocol
#investigation_first
#strict_guardrail
#troubleshooting_protocol
Edit
When working with codebases, especially complex ones like Node-RED RabbitMQ components, NEVER proceed to code changes without a complete understanding of the system. Always follow this strict protocol:

PHASE 1 - THOROUGH CODE EXPLORATION:
- Map out all related files and their interdependencies
- Trace the execution flow through the system
- Identify key data structures and state management
- Document the existing error handling patterns

PHASE 2 - PROBLEM DIAGNOSIS WITH EVIDENCE:
- Reproduce the issue in isolation if possible
- Collect logs, error messages, and stack traces
- Identify specific failing conditions
- Compare working vs non-working scenarios
- Present clear evidence for your diagnosis

PHASE 3 - SOLUTION PROPOSAL (NO CODE YET):
- Present multiple possible approaches with pros/cons
- Explain impact on related components
- Estimate complexity and risk of each approach
- Get explicit user confirmation before proceeding

PHASE 4 - IMPLEMENTATION WITH VERIFICATION:
- Start with minimal changes to address the core issue
- Add logging to verify behavior
- Test thoroughly after each change
- Verify no new issues are introduced

ANY CODE CHANGE MUST BE PRECEDED BY PHASES 1-3.