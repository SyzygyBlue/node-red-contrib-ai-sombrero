/**
 * MCP Node Editor Script
 * Handles the editor UI for the MCP node
 */

(function() {
    // Tab definitions
    const tabs = [
        { id: "rules-tab", label: "Rules", template: "rules-template.html" },
        { id: "outputs-tab", label: "Outputs", template: "outputs-template.html" },
        { id: "ai-tab", label: "AI Routing", template: "ai-template.html" },
        { id: "debug-tab", label: "Debug", template: "debug-template.html" }
    ];
    
    // Initialize the editor
    function initEditor() {
        // Create tabs
        const $tabs = $("#mcp-node-tabs");
        const $content = $("#mcp-node-tab-content");
        
        // Clear any existing content
        $tabs.empty();
        $content.empty();
        
        // Create tab headers
        tabs.forEach((tab, index) => {
            const $li = $("<li/>", { class: index === 0 ? "active" : "" });
            const $a = $("<a/>", { 
                href: "#" + tab.id, 
                "data-toggle": "tab",
                text: tab.label
            });
            
            $li.append($a);
            $tabs.append($li);
            
            // Create tab content container
            const $tabContent = $("<div/>", { 
                id: tab.id, 
                class: "tab-pane" + (index === 0 ? " active" : "")
            });
            
            $content.append($tabContent);
            
            // Load tab template
            loadTemplate(tab.template, tab.id);
        });
        
        // Tab click handler
        $tabs.find("a").click(function(e) {
            e.preventDefault();
            const tabId = $(this).attr("href").substring(1);
            
            // Activate selected tab
            $tabs.find("li").removeClass("active");
            $(this).parent().addClass("active");
            
            // Show selected tab content
            $content.children().removeClass("active");
            $("#" + tabId).addClass("active");
        });
        
        // Show/hide LLM config based on routing mode
        $("#node-input-routingMode").change(function() {
            const mode = $(this).val();
            if (mode === "ai" || mode === "hybrid") {
                $("#llm-config-row").show();
            } else {
                $("#llm-config-row").hide();
            }
        }).trigger("change");
        
        // Initialize components when templates are loaded
        setTimeout(initComponents, 100);
    }
    
    // Load a template into a container
    function loadTemplate(templateName, containerId) {
        // Use the path format that matches the server-side endpoint
        $.get("/mcp-node/ui/templates/" + templateName, function(data) {
            $("#" + containerId).html(data);
            
            // Initialize components specific to this template
            if (containerId === "rules-tab") {
                initRulesEditor();
            } else if (containerId === "outputs-tab") {
                initOutputsEditor();
            } else if (containerId === "ai-tab") {
                initAIEditor();
            } else if (containerId === "debug-tab") {
                initDebugEditor();
            }
        });
    }
    
    // Initialize all components
    function initComponents() {
        // This will be called after templates are loaded
        // Each specific component will be initialized by its own function
    }
    
    // Initialize rules editor
    function initRulesEditor() {
        // Will be implemented when rules-template.html is loaded
        if (typeof window.mcpNodeInitRules === 'function') {
            window.mcpNodeInitRules();
        }
    }
    
    // Initialize outputs editor
    function initOutputsEditor() {
        // Will be implemented when outputs-template.html is loaded
        if (typeof window.mcpNodeInitOutputs === 'function') {
            window.mcpNodeInitOutputs();
        }
    }
    
    // Initialize AI editor
    function initAIEditor() {
        // Will be implemented when ai-template.html is loaded
        if (typeof window.mcpNodeInitAI === 'function') {
            window.mcpNodeInitAI();
        }
    }
    
    // Initialize debug editor
    function initDebugEditor() {
        // Will be implemented when debug-template.html is loaded
        if (typeof window.mcpNodeInitDebug === 'function') {
            window.mcpNodeInitDebug();
        }
    }
    
    // Resize handler
    window.mcpNodeResize = function() {
        const tabs = $("#mcp-node-tabs");
        const content = $("#mcp-node-tab-content");
        
        // Adjust height based on available space
        const newHeight = $(".red-ui-editor-dialog").height() - tabs.offset().top - 20;
        content.height(Math.max(300, newHeight));
        
        // Resize specific components
        if (typeof window.mcpNodeResizeRules === 'function') {
            window.mcpNodeResizeRules();
        }
        
        if (typeof window.mcpNodeResizeAI === 'function') {
            window.mcpNodeResizeAI();
        }
    };
    
    // Save data from all tabs
    window.mcpNodeSaveData = function() {
        const data = {
            rules: [],
            outputLabels: [],
            aiPromptTemplate: ""
        };
        
        // Collect data from rules tab
        if (typeof window.mcpNodeGetRules === 'function') {
            data.rules = window.mcpNodeGetRules();
        }
        
        // Collect data from outputs tab
        if (typeof window.mcpNodeGetOutputs === 'function') {
            data.outputLabels = window.mcpNodeGetOutputs();
        }
        
        // Collect data from AI tab
        if (typeof window.mcpNodeGetAIPrompt === 'function') {
            data.aiPromptTemplate = window.mcpNodeGetAIPrompt();
        }
        
        return data;
    };
    
    // Initialize the editor when document is ready
    $(function() {
        initEditor();
    });
})();
