/**
 * MCP Node Editor Script
 * Handles the editor UI for the MCP node
 */

(function() {
    // Tab definitions
    
    
    // Helper to load HTML templates and ensure inline <script> blocks are executed
    function loadTemplateInto(path, $target, initCallback) {
        $.get(path, function(html) {
            // Parse HTML and keep <script> tags
            const parsed = $.parseHTML(html, document, true);
            // Separate script and non-script elements
            const $scripts = $(parsed).filter('script');
            const $content = $(parsed).filter(function() {
                return this.nodeName.toLowerCase() !== 'script';
            });
            // Inject non-script content
            $target.empty().append($content);
            // Execute scripts manually so they are registered
            $scripts.each(function() {
                const src = $(this).attr('src');
                if (src) {
                    // External script – load asynchronously then continue
                    $.getScript(src, function() {
                        if (typeof initCallback === 'function') initCallback();
                    });
                } else {
                    $.globalEval(this.text || this.textContent || this.innerText || '');
                }
            });
            // If there were no external scripts, invoke callback now
            if (!$scripts.filter('[src]').length && typeof initCallback === 'function') {
                initCallback();
            }
        });
    }

    // Initialize the editor (no tabs)
    function initEditor() {
        const $rulesContainer = $('#mcp-rules-container');
        const $advContainer = $('#mcp-advanced-container');

        // Load Rules editor and execute its script
        loadTemplateInto('/mcp-node/ui/templates/rules-v2-template.html', $rulesContainer, function() {
            if (typeof window.mcpNodeInitRules === 'function') window.mcpNodeInitRules();
        });

        // Load AI template (hidden by default)
        loadTemplateInto('/mcp-node/ui/templates/ai-template.html', $('#mcp-ai-container'), function() {
            if (typeof window.mcpNodeInitAI === 'function') window.mcpNodeInitAI();
        });

        // Load Advanced template
        loadTemplateInto('/mcp-node/ui/templates/advanced-template.html', $advContainer, function() {
            if (typeof window.mcpNodeInitAdvanced === 'function') window.mcpNodeInitAdvanced();
        });

        // Toggle AI panel via magnifier
        $('#mcp-ai-edit').click(function(e) {
            e.preventDefault();
            $('#mcp-ai-container').toggle();
            if ($('#mcp-ai-container').is(':visible') && typeof window.mcpNodeResizeAI==='function') window.mcpNodeResizeAI();
        });

        // Toggle advanced panel
        $('#advanced-toggle').click(function(e) {
            e.preventDefault();
            $advContainer.toggle();
        });
    }
    
        

    // Initialize rules editor
    function initRulesEditor() {
        // Will be implemented when rules-template.html is loaded
        if (typeof window.mcpNodeInitRules === 'function') {
            window.mcpNodeInitRules();
        }
    }
    
    // Initialize advanced editor
    // Save data from all tabs
    window.mcpNodeSaveData = function() {
        const data = {
            rules: [],
            outputLabels: []
        };
        
        // Collect data from rules tab
        if (typeof window.mcpNodeGetRules === 'function') {
            data.rules = window.mcpNodeGetRules();
        }
        
        // output labels are already synced by rules editor
        const node = RED.nodes.node(RED.editor.activeNode.id);
        data.outputLabels = node.outputLabels || [];
        
                // AI prompt
        if (typeof window.mcpNodeGetAIPrompt==='function') {
            data.aiPromptTemplate = window.mcpNodeGetAIPrompt();
        }
        return data;
    };
    
    // Initialize the editor when document is ready
    $(function() {
        initEditor();
    });
})();
