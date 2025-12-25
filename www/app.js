// Technitium DNS Server App Configurator
class AppConfigurator {
    constructor() {
        this.apps = [];
        this.currentApp = null;
        this.currentConfig = null;
        this.init();
    }

    async init() {
        await this.loadApps();
        this.setupEventListeners();
        this.adjustContainerPadding();
    }

    adjustContainerPadding() {
        // Adjust container padding based on actual header height
        const header = document.querySelector('header');
        const container = document.querySelector('.container');
        if (header && container) {
            const headerHeight = header.offsetHeight;
            container.style.marginTop = `${headerHeight}px`;
        }
    }

    async loadApps() {
        try {
            // Load the list of config files
            const filesResponse = await fetch('/app-configs/config-files.json');
            if (!filesResponse.ok) {
                throw new Error(`HTTP error! status: ${filesResponse.status}`);
            }
            const filesData = await filesResponse.json();
            
            // Load each config file and extract metadata
            this.apps = [];
            const loadPromises = filesData.configFiles.map(async (filename) => {
                try {
                    const configResponse = await fetch(`/app-configs/${filename}`);
                    if (!configResponse.ok) {
                        console.warn(`Failed to load ${filename}: ${configResponse.status}`);
                        return null;
                    }
                    const configData = await configResponse.json();
                    
                    // Extract metadata from config file
                    if (configData.id && configData.name) {
                        return {
                            id: configData.id,
                            name: configData.name,
                            description: configData.description || '',
                            configFile: filename
                        };
                    } else {
                        console.warn(`Config file ${filename} missing required metadata (id, name)`);
                        return null;
                    }
                } catch (error) {
                    console.warn(`Error loading ${filename}:`, error);
                    return null;
                }
            });
            
            const loadedApps = await Promise.all(loadPromises);
            this.apps = loadedApps.filter(app => app !== null);
            
            this.populateAppSelector();
        } catch (error) {
            console.error('Failed to load apps:', error);
            const select = document.getElementById('appSelect');
            if (select) {
                const option = document.createElement('option');
                option.textContent = 'Error loading apps - please refresh';
                option.disabled = true;
                select.appendChild(option);
            }
        }
    }

    populateAppSelector() {
        const select = document.getElementById('appSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Select an app --</option>';
        
        if (!this.apps || this.apps.length === 0) {
            console.warn('No apps loaded');
            return;
        }
        
        // Sort apps alphabetically by name
        const sortedApps = [...this.apps].sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        });
        
        console.log(`Loading ${sortedApps.length} apps (sorted alphabetically)`);
        
        sortedApps.forEach(app => {
            const option = document.createElement('option');
            option.value = app.id;
            option.textContent = app.name;
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        document.getElementById('appSelect').addEventListener('change', (e) => {
            this.loadApp(e.target.value);
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportConfig();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            this.showImportModal();
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetForm();
        });

        document.getElementById('closeModal').addEventListener('click', () => {
            document.getElementById('exportModal').style.display = 'none';
        });

        document.getElementById('closeImportModal').addEventListener('click', () => {
            document.getElementById('importModal').style.display = 'none';
        });

        document.getElementById('copyBtn').addEventListener('click', () => {
            this.copyToClipboard();
        });

        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.downloadConfig();
        });

        document.getElementById('importSubmitBtn').addEventListener('click', () => {
            this.importConfig();
        });

        // Close modals when clicking outside
        document.getElementById('exportModal').addEventListener('click', (e) => {
            if (e.target.id === 'exportModal') {
                document.getElementById('exportModal').style.display = 'none';
            }
        });

        document.getElementById('importModal').addEventListener('click', (e) => {
            if (e.target.id === 'importModal') {
                document.getElementById('importModal').style.display = 'none';
            }
        });
    }

    async loadApp(appId) {
        if (!appId) {
            document.getElementById('configForm').style.display = 'none';
            document.getElementById('headerActions').style.display = 'none';
            return;
        }

        const app = this.apps.find(a => a.id === appId);
        if (!app) return;

        this.currentApp = app;

        try {
            const response = await fetch(`/app-configs/${app.configFile}`);
            const configData = await response.json();
            
            // Extract fields from config (metadata is at root level, fields are in 'fields' property)
            this.currentConfig = {
                fields: configData.fields || []
            };
            
            // Use metadata from config file (in case it was updated)
            const appName = configData.name || app.name;
            const appDescription = configData.description || app.description || '';
            
            document.getElementById('appName').textContent = appName;
            document.getElementById('appDescription').textContent = appDescription;
            document.getElementById('configForm').style.display = 'block';
            document.getElementById('headerActions').style.display = 'flex';
            
            this.renderForm();
        } catch (error) {
            console.error('Failed to load app config:', error);
            this.showError(`Failed to load configuration for ${app.name}`);
        }
    }

    renderForm() {
        const form = document.getElementById('mainForm');
        form.innerHTML = '';
        
        if (!this.currentConfig || !this.currentConfig.fields) {
            form.innerHTML = '<p>No configuration fields defined for this app.</p>';
            return;
        }

        this.currentConfig.fields.forEach(field => {
            const fieldElement = this.createFieldElement(field);
            form.appendChild(fieldElement);
        });
    }

    createFieldElement(field) {
        const group = document.createElement('div');
        group.className = 'form-group';

        // Fields that have their own headers don't need a separate label
        const hasOwnHeader = field.type === 'array' || field.type === 'array-of-objects' || 
                            (field.type === 'object' && field.label);

        // For checkboxes, we'll handle the label differently
        if (field.type !== 'boolean' && !hasOwnHeader) {
            const labelContainer = document.createElement('div');
            labelContainer.className = 'label-container';
            
            const label = document.createElement('label');
            label.textContent = field.label;
            if (field.required) {
                label.innerHTML += ' <span style="color: red;">*</span>';
            }
            labelContainer.appendChild(label);
            
            // Add help icon if help text exists
            if (field.help) {
                const helpIcon = document.createElement('span');
                helpIcon.className = 'help-icon';
                helpIcon.innerHTML = '?';
                helpIcon.title = field.help;
                helpIcon.setAttribute('aria-label', 'Help');
                
                // Create tooltip
                const tooltip = document.createElement('div');
                tooltip.className = 'help-tooltip';
                tooltip.textContent = field.help;
                helpIcon.appendChild(tooltip);
                
                // Position tooltip on hover to avoid clipping
                helpIcon.addEventListener('mouseenter', (e) => {
                    const rect = helpIcon.getBoundingClientRect();
                    const tooltipWidth = 400; // max-width
                    const spaceOnRight = window.innerWidth - rect.right;
                    const spaceOnLeft = rect.left;
                    
                    if (spaceOnRight < tooltipWidth / 2 && spaceOnLeft > spaceOnRight) {
                        // Position on left side if not enough space on right
                        tooltip.style.left = `${rect.left}px`;
                        tooltip.style.transform = 'translateX(-100%)';
                    } else {
                        // Center above icon
                        tooltip.style.left = `${rect.left + (rect.width / 2)}px`;
                        tooltip.style.transform = 'translateX(-50%)';
                    }
                    tooltip.style.bottom = `${window.innerHeight - rect.top + 8}px`;
                });
                
                // Stop propagation so clicking help icon doesn't trigger parent click handlers
                helpIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                
                labelContainer.appendChild(helpIcon);
            }
            
            group.appendChild(labelContainer);
        }

        let input;

        switch (field.type) {
            case 'boolean':
                input = this.createCheckbox(field, field.label, field.required, field.help);
                break;
            case 'number':
                input = this.createNumberInput(field);
                break;
            case 'string':
            case 'url':
                input = this.createTextInput(field);
                break;
            case 'textarea':
                input = this.createTextarea(field);
                break;
            case 'select':
                input = this.createSelect(field);
                break;
            case 'array':
                input = this.createArrayInput(field);
                break;
            case 'object':
                input = this.createObjectInput(field);
                break;
            case 'array-of-objects':
                input = this.createArrayOfObjectsInput(field);
                break;
            default:
                input = this.createTextInput(field);
        }

        group.appendChild(input);
        return group;
    }

    createCheckbox(field, labelText, required, helpText) {
        const container = document.createElement('div');
        container.className = 'checkbox-group';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = field.name;
        input.name = field.name;
        input.checked = field.default !== undefined ? field.default : false;
        
        const label = document.createElement('label');
        label.setAttribute('for', field.name);
        label.className = 'checkbox-label';
        label.textContent = labelText || field.label;
        if (required) {
            label.innerHTML += ' <span style="color: red;">*</span>';
        }
        
        container.appendChild(input);
        container.appendChild(label);
        
        if (helpText) {
            const help = document.createElement('div');
            help.className = 'help-text';
            help.textContent = helpText;
            container.appendChild(help);
        }
        
        return container;
    }

    createNumberInput(field) {
        const input = document.createElement('input');
        input.type = 'number';
        input.id = field.name;
        input.name = field.name;
        if (field.default !== undefined) input.value = field.default;
        if (field.min !== undefined) input.min = field.min;
        if (field.max !== undefined) input.max = field.max;
        return input;
    }

    createTextInput(field) {
        const input = document.createElement('input');
        input.type = field.type === 'url' ? 'url' : 'text';
        input.id = field.name;
        input.name = field.name;
        if (field.default !== undefined) input.value = field.default;
        if (field.placeholder) input.placeholder = field.placeholder;
        return input;
    }

    createTextarea(field) {
        const textarea = document.createElement('textarea');
        textarea.id = field.name;
        textarea.name = field.name;
        if (field.default !== undefined) textarea.value = field.default;
        if (field.placeholder) textarea.placeholder = field.placeholder;
        if (field.rows) textarea.rows = field.rows;
        return textarea;
    }

    createSelect(field) {
        const select = document.createElement('select');
        select.id = field.name;
        select.name = field.name;
        
        if (field.options) {
            field.options.forEach(option => {
                const opt = document.createElement('option');
                opt.value = option.value;
                opt.textContent = option.label;
                if (field.default === option.value) opt.selected = true;
                select.appendChild(opt);
            });
        }
        
        return select;
    }

    createArrayInput(field) {
        const container = document.createElement('div');
        container.className = 'array-container collapsible-section';
        container.dataset.fieldName = field.name;
        container.dataset.fieldType = field.itemType || 'string';

        const header = document.createElement('div');
        header.className = 'collapsible-section-header';
        
        const toggleCollapse = () => {
            const content = container.querySelector('.collapsible-section-content');
            if (content) {
                const isCollapsed = content.style.display === 'none';
                content.style.display = isCollapsed ? 'block' : 'none';
                collapseBtn.innerHTML = isCollapsed ? '▼' : '▶';
                collapseBtn.setAttribute('aria-label', isCollapsed ? 'Collapse' : 'Expand');
            }
        };
        
        const collapseBtn = document.createElement('button');
        collapseBtn.type = 'button';
        collapseBtn.className = 'collapse-btn';
        collapseBtn.innerHTML = '▼';
        collapseBtn.setAttribute('aria-label', 'Collapse');
        collapseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCollapse();
        });
        header.appendChild(collapseBtn);
        
        // Make header clickable to toggle collapse
        header.addEventListener('click', (e) => {
            // Don't toggle if clicking a button, input, select, or help icon
            if (!e.target.closest('button') && !e.target.closest('input') && !e.target.closest('select') && 
                !e.target.closest('.help-icon') && e.target.className !== 'help-icon') {
                toggleCollapse();
            }
        });
        
        const label = document.createElement('label');
        label.textContent = field.label;
        if (field.required) {
            label.innerHTML += ' <span style="color: red;">*</span>';
        }
        header.appendChild(label);
        
        // Add help icon if help text exists
        if (field.help) {
            const helpIcon = document.createElement('span');
            helpIcon.className = 'help-icon';
            helpIcon.innerHTML = '?';
            helpIcon.title = field.help;
            helpIcon.setAttribute('aria-label', 'Help');
            
            const tooltip = document.createElement('div');
            tooltip.className = 'help-tooltip';
            tooltip.textContent = field.help;
            helpIcon.appendChild(tooltip);
            
            // Position tooltip on hover to avoid clipping
            helpIcon.addEventListener('mouseenter', (e) => {
                const rect = helpIcon.getBoundingClientRect();
                const tooltipWidth = 400; // max-width
                const spaceOnRight = window.innerWidth - rect.right;
                const spaceOnLeft = rect.left;
                
                if (spaceOnRight < tooltipWidth / 2 && spaceOnLeft > spaceOnRight) {
                    // Position on left side if not enough space on right
                    tooltip.style.left = `${rect.left}px`;
                    tooltip.style.transform = 'translateX(-100%)';
                } else {
                    // Center above icon
                    tooltip.style.left = `${rect.left + (rect.width / 2)}px`;
                    tooltip.style.transform = 'translateX(-50%)';
                }
                tooltip.style.bottom = `${window.innerHeight - rect.top + 8}px`;
            });
            
            // Stop propagation so clicking help icon doesn't trigger header collapse
            helpIcon.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            header.appendChild(helpIcon);
        }
        
        container.appendChild(header);

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'collapsible-section-content';
        
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn btn-small add-item-btn';
        addBtn.textContent = `Add ${field.itemLabel || 'Item'}`;
        addBtn.addEventListener('click', () => this.addArrayItem(container, field));
        contentWrapper.appendChild(addBtn);

        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'array-items';
        contentWrapper.appendChild(itemsContainer);
        
        container.appendChild(contentWrapper);

        if (field.default && Array.isArray(field.default)) {
            field.default.forEach((item, index) => {
                this.addArrayItem(container, field, item, index);
            });
        }

        return container;
    }

    addArrayItem(container, field, value = '', index = null) {
        const itemsContainer = container.querySelector('.array-items');
        const itemIndex = index !== null ? index : itemsContainer.children.length;
        
        const item = document.createElement('div');
        item.className = 'array-item array-item-simple';
        item.dataset.index = itemIndex;

        const inlineRow = document.createElement('div');
        inlineRow.className = 'array-item-inline-row';
        
        const labelContainer = document.createElement('div');
        labelContainer.className = 'array-item-label-container';
        
        const label = document.createElement('label');
        label.className = 'array-item-label';
        label.textContent = `${field.itemLabel || 'Item'} ${itemIndex + 1}:`;
        labelContainer.appendChild(label);
        
        inlineRow.appendChild(labelContainer);

        const input = document.createElement('input');
        input.type = 'text';
        input.name = `${field.name}[${itemIndex}]`;
        // Ensure value is a string, not an array or object
        input.value = (typeof value === 'string' || typeof value === 'number') ? String(value) : '';
        input.className = 'array-item-input';
        if (field.placeholder) input.placeholder = field.placeholder;
        inlineRow.appendChild(input);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-danger btn-small';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => item.remove());
        inlineRow.appendChild(removeBtn);
        
        item.appendChild(inlineRow);
        itemsContainer.appendChild(item);
    }

    createObjectInput(field) {
        const container = document.createElement('div');
        container.className = 'object-group collapsible-section';
        container.dataset.fieldName = field.name;
        container.dataset.isKeyValueMap = field.isKeyValueMap ? 'true' : 'false';

        if (field.label) {
            const header = document.createElement('div');
            header.className = 'collapsible-section-header';
            
            const toggleCollapse = () => {
                const content = container.querySelector('.collapsible-section-content');
                if (content) {
                    const isCollapsed = content.style.display === 'none';
                    content.style.display = isCollapsed ? 'block' : 'none';
                    collapseBtn.innerHTML = isCollapsed ? '▼' : '▶';
                    collapseBtn.setAttribute('aria-label', isCollapsed ? 'Collapse' : 'Expand');
                }
            };
            
            const collapseBtn = document.createElement('button');
            collapseBtn.type = 'button';
            collapseBtn.className = 'collapse-btn';
            collapseBtn.innerHTML = '▼';
            collapseBtn.setAttribute('aria-label', 'Collapse');
            collapseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleCollapse();
            });
            header.appendChild(collapseBtn);
            
            // Make header clickable to toggle collapse
            header.addEventListener('click', (e) => {
                // Don't toggle if clicking a button or input
                if (!e.target.closest('button') && !e.target.closest('input') && !e.target.closest('select')) {
                    toggleCollapse();
                }
            });
            
            const title = document.createElement('div');
            title.className = 'object-group-title';
            title.textContent = field.label;
            header.appendChild(title);
            
            // Add help icon if help text exists
            if (field.help) {
                const helpIcon = document.createElement('span');
                helpIcon.className = 'help-icon';
                helpIcon.innerHTML = '?';
                helpIcon.title = field.help;
                helpIcon.setAttribute('aria-label', 'Help');
                
                const tooltip = document.createElement('div');
                tooltip.className = 'help-tooltip';
                tooltip.textContent = field.help;
                helpIcon.appendChild(tooltip);
                
                // Position tooltip on hover to avoid clipping
                helpIcon.addEventListener('mouseenter', (e) => {
                    const rect = helpIcon.getBoundingClientRect();
                    const tooltipWidth = 400; // max-width
                    const spaceOnRight = window.innerWidth - rect.right;
                    const spaceOnLeft = rect.left;
                    
                    if (spaceOnRight < tooltipWidth / 2 && spaceOnLeft > spaceOnRight) {
                        // Position on left side if not enough space on right
                        tooltip.style.left = `${rect.left}px`;
                        tooltip.style.transform = 'translateX(-100%)';
                    } else {
                        // Center above icon
                        tooltip.style.left = `${rect.left + (rect.width / 2)}px`;
                        tooltip.style.transform = 'translateX(-50%)';
                    }
                    tooltip.style.bottom = `${window.innerHeight - rect.top + 8}px`;
                });
                
                header.appendChild(helpIcon);
            }
            
            container.appendChild(header);
            
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'collapsible-section-content';
            container.appendChild(contentWrapper);
        } else {
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'collapsible-section-content';
            container.appendChild(contentWrapper);
        }

        const contentWrapper = container.querySelector('.collapsible-section-content') || container;
        
        if (field.isKeyValueMap) {
            // Key-value map (like networkGroupMap)
            const mapContainer = document.createElement('div');
            mapContainer.className = 'key-value-map';
            
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'btn btn-small add-item-btn';
            addBtn.textContent = `Add ${field.keyLabel || 'Entry'}`;
            addBtn.addEventListener('click', () => this.addKeyValueEntry(mapContainer, field));
            contentWrapper.appendChild(addBtn);

            const entriesContainer = document.createElement('div');
            entriesContainer.className = 'map-entries';
            mapContainer.appendChild(entriesContainer);
            contentWrapper.appendChild(mapContainer);
        } else if (field.properties) {
            // Regular object with properties
            field.properties.forEach(prop => {
                const propElement = this.createFieldElement(prop);
                const label = propElement.querySelector('label, .label-container label');
                if (label) label.textContent = prop.label;
                contentWrapper.appendChild(propElement);
            });
        }

        return container;
    }

    addKeyValueEntry(container, field) {
        const entriesContainer = container.querySelector('.map-entries');
        const entryIndex = entriesContainer.children.length;
        
        const entry = document.createElement('div');
        entry.className = 'array-item array-item-key-value';
        entry.dataset.index = entryIndex;

        const inlineRow = document.createElement('div');
        inlineRow.className = 'key-value-row';
        
        // Key label and input
        const keyLabel = document.createElement('label');
        keyLabel.className = 'key-value-label';
        keyLabel.textContent = field.keyLabel || 'Key:';
        inlineRow.appendChild(keyLabel);
        
        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.name = `${field.name}_key_${entryIndex}`;
        keyInput.placeholder = field.keyPlaceholder || '';
        keyInput.className = 'map-key-input';
        inlineRow.appendChild(keyInput);

        // Value label and input
        const valueLabel = document.createElement('label');
        valueLabel.className = 'key-value-label';
        valueLabel.textContent = field.valueLabel || 'Value:';
        inlineRow.appendChild(valueLabel);
        
        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.name = `${field.name}_value_${entryIndex}`;
        valueInput.placeholder = field.valuePlaceholder || '';
        valueInput.className = 'map-value-input';
        inlineRow.appendChild(valueInput);

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-danger btn-small';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => entry.remove());
        inlineRow.appendChild(removeBtn);
        
        entry.appendChild(inlineRow);
        entriesContainer.appendChild(entry);
    }

    createArrayOfObjectsInput(field) {
        const container = document.createElement('div');
        container.className = 'array-of-objects collapsible-section';
        container.dataset.fieldName = field.name;

        const header = document.createElement('div');
        header.className = 'collapsible-section-header';
        
        const toggleCollapse = () => {
            const content = container.querySelector('.collapsible-section-content');
            if (content) {
                const isCollapsed = content.style.display === 'none';
                content.style.display = isCollapsed ? 'block' : 'none';
                collapseBtn.innerHTML = isCollapsed ? '▼' : '▶';
                collapseBtn.setAttribute('aria-label', isCollapsed ? 'Collapse' : 'Expand');
            }
        };
        
        const collapseBtn = document.createElement('button');
        collapseBtn.type = 'button';
        collapseBtn.className = 'collapse-btn';
        collapseBtn.innerHTML = '▼';
        collapseBtn.setAttribute('aria-label', 'Collapse');
        collapseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCollapse();
        });
        header.appendChild(collapseBtn);
        
        // Make header clickable to toggle collapse
        header.addEventListener('click', (e) => {
            // Don't toggle if clicking a button, input, select, or help icon
            if (!e.target.closest('button') && !e.target.closest('input') && !e.target.closest('select') && 
                !e.target.closest('.help-icon') && e.target.className !== 'help-icon') {
                toggleCollapse();
            }
        });
        
        const label = document.createElement('label');
        label.textContent = field.label;
        if (field.required) {
            label.innerHTML += ' <span style="color: red;">*</span>';
        }
        header.appendChild(label);
        
        // Add help icon if help text exists
        if (field.help) {
            const helpIcon = document.createElement('span');
            helpIcon.className = 'help-icon';
            helpIcon.innerHTML = '?';
            helpIcon.title = field.help;
            helpIcon.setAttribute('aria-label', 'Help');
            
            const tooltip = document.createElement('div');
            tooltip.className = 'help-tooltip';
            tooltip.textContent = field.help;
            helpIcon.appendChild(tooltip);
            
            // Position tooltip on hover to avoid clipping
            helpIcon.addEventListener('mouseenter', (e) => {
                const rect = helpIcon.getBoundingClientRect();
                const tooltipWidth = 400; // max-width
                const spaceOnRight = window.innerWidth - rect.right;
                const spaceOnLeft = rect.left;
                
                if (spaceOnRight < tooltipWidth / 2 && spaceOnLeft > spaceOnRight) {
                    // Position on left side if not enough space on right
                    tooltip.style.left = `${rect.left}px`;
                    tooltip.style.transform = 'translateX(-100%)';
                } else {
                    // Center above icon
                    tooltip.style.left = `${rect.left + (rect.width / 2)}px`;
                    tooltip.style.transform = 'translateX(-50%)';
                }
                tooltip.style.bottom = `${window.innerHeight - rect.top + 8}px`;
            });
            
            // Stop propagation so clicking help icon doesn't trigger header collapse
            helpIcon.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            header.appendChild(helpIcon);
        }
        
        container.appendChild(header);

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'collapsible-section-content';
        
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn btn-small add-item-btn';
        addBtn.textContent = `Add ${field.itemLabel || 'Item'}`;
        addBtn.addEventListener('click', () => this.addObjectItem(container, field));
        contentWrapper.appendChild(addBtn);

        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'array-items';
        contentWrapper.appendChild(itemsContainer);
        
        container.appendChild(contentWrapper);

        if (field.default && Array.isArray(field.default)) {
            field.default.forEach((item, index) => {
                this.addObjectItem(container, field, item, index);
            });
        }

        return container;
    }

    addObjectItem(container, field, value = null, index = null) {
        const itemsContainer = container.querySelector('.array-items');
        const itemIndex = index !== null ? index : itemsContainer.children.length;

        const item = document.createElement('div');
        item.className = 'array-item';
        item.dataset.index = itemIndex;

        // Separate simple fields (for inline layout) from complex fields
        const simpleFields = [];
        const complexFields = [];

        if (field.itemProperties) {
            field.itemProperties.forEach(prop => {
                // Simple fields: text, number, url, select, boolean
                // Arrays and objects are complex fields
                if (prop.type === 'string' || prop.type === 'number' || prop.type === 'url' || 
                    prop.type === 'select' || prop.type === 'boolean') {
                    simpleFields.push(prop);
                } else {
                    complexFields.push(prop);
                }
            });
        }

        // Create header with title, collapse button, and remove button
        const header = document.createElement('div');
        header.className = 'array-item-header';
        
        const toggleCollapse = () => {
            const content = item.querySelector('.array-item-content');
            if (content) {
                const isCollapsed = content.style.display === 'none';
                content.style.display = isCollapsed ? 'block' : 'none';
                collapseBtn.innerHTML = isCollapsed ? '▼' : '▶';
                collapseBtn.setAttribute('aria-label', isCollapsed ? 'Collapse' : 'Expand');
            }
        };
        
        const titleContainer = document.createElement('div');
        titleContainer.className = 'array-item-title-container';
        
        const collapseBtn = document.createElement('button');
        collapseBtn.type = 'button';
        collapseBtn.className = 'collapse-btn';
        collapseBtn.innerHTML = '▼';
        collapseBtn.setAttribute('aria-label', 'Collapse');
        collapseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCollapse();
        });
        titleContainer.appendChild(collapseBtn);
        
        // Make header clickable to toggle collapse
        header.addEventListener('click', (e) => {
            // Don't toggle if clicking the remove button
            if (!e.target.closest('.array-item-actions')) {
                toggleCollapse();
            }
        });
        
        const title = document.createElement('div');
        title.className = 'array-item-title';
        title.textContent = `${field.itemLabel || 'Item'} ${itemIndex + 1}`;
        titleContainer.appendChild(title);
        
        header.appendChild(titleContainer);

        const actions = document.createElement('div');
        actions.className = 'array-item-actions';
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-danger btn-small';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => item.remove());
        actions.appendChild(removeBtn);
        
        header.appendChild(actions);
        item.appendChild(header);
        
        // Wrap content in a collapsible container
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'array-item-content';
        item.appendChild(contentWrapper);

        // Create inline fields container for simple fields
        if (simpleFields.length > 0) {
            const inlineContainer = document.createElement('div');
            inlineContainer.className = 'array-item-inline-fields';
            
            simpleFields.forEach(prop => {
                const propElement = this.createFieldElement(prop);
                propElement.className += ' inline-field';
                const input = propElement.querySelector('input, textarea, select');
                
                // Update input name for nested structure
                if (input) {
                    input.name = `${field.name}[${itemIndex}].${prop.name}`;
                }
                
                // Populate the field with value if provided
                if (value && value[prop.name] !== undefined) {
                    this.populateFieldElement(propElement, prop, value[prop.name], `${field.name}[${itemIndex}]`);
                }
                
                inlineContainer.appendChild(propElement);
            });
            
            contentWrapper.appendChild(inlineContainer);
        }

        // Add complex fields below (arrays, objects, textareas, etc.)
        if (complexFields.length > 0) {
            const complexContainer = document.createElement('div');
            complexContainer.className = 'array-item-complex-fields';
            
            complexFields.forEach(prop => {
                const propElement = this.createFieldElement(prop);
                const input = propElement.querySelector('input, textarea, select');
                
                // Update input name for nested structure
                if (input) {
                    input.name = `${field.name}[${itemIndex}].${prop.name}`;
                }
                
                // Populate the field with value if provided
                if (value && value[prop.name] !== undefined) {
                    // Ensure we're passing the correct value type
                    let propValue = value[prop.name];
                    
                    // Special handling for arrays - ensure it's actually an array
                    if (prop.type === 'array') {
                        if (typeof propValue === 'string') {
                            // If it's a string, try to parse it as JSON or split by comma
                            try {
                                propValue = JSON.parse(propValue);
                            } catch (e) {
                                // If not valid JSON, split by comma
                                propValue = propValue.split(',').map(v => v.trim()).filter(v => v);
                            }
                        } else if (!Array.isArray(propValue)) {
                            console.warn(`Expected array for ${prop.name}, got:`, typeof propValue, propValue);
                            propValue = [String(propValue)];
                        }
                    }
                    
                    this.populateFieldElement(propElement, prop, propValue, `${field.name}[${itemIndex}]`);
                }
                
                complexContainer.appendChild(propElement);
            });
            
            contentWrapper.appendChild(complexContainer);
        }

        itemsContainer.appendChild(item);
    }

    collectFormData() {
        const form = document.getElementById('mainForm');
        const formData = new FormData(form);
        const data = {};

        // Collect regular fields
        for (const [key, value] of formData.entries()) {
            // Skip key-value map inputs (they're handled separately)
            if (key.match(/_(key|value)_\d+$/)) {
                continue;
            }
            
            // Skip inputs that are part of array-of-objects (they're handled separately)
            if (key.includes('[') && key.includes('.')) {
                continue;
            }
            
            if (!key.includes('[') && !key.includes('.')) {
                const field = this.currentConfig.fields.find(f => f.name === key);
                if (field) {
                    if (field.type === 'boolean') {
                        data[key] = formData.has(key);
                    } else if (field.type === 'number') {
                        const numVal = Number(value);
                        data[key] = isNaN(numVal) ? value : numVal;
                    } else {
                        const val = value || undefined;
                        if (val) data[key] = val;
                    }
                }
            }
        }

        // Collect array fields (only top-level arrays, not nested ones)
        const arrayContainers = form.querySelectorAll('.array-container');
        arrayContainers.forEach(container => {
            // Skip arrays that are nested within array-of-objects items
            if (container.closest('.array-item')) {
                return; // This is a nested array, skip it
            }
            
            const fieldName = container.dataset.fieldName;
            const field = this.currentConfig.fields.find(f => f.name === fieldName);
            // Only collect if it's a top-level array field
            if (field && field.type === 'array') {
                const items = container.querySelectorAll('.array-item input');
                const values = Array.from(items).map(input => {
                    const val = input.value.trim();
                    return val || undefined;
                }).filter(v => v !== undefined);
                if (values.length > 0) {
                    data[fieldName] = values;
                }
            }
        });

        // Collect array-of-objects fields
        const arrayOfObjectsContainers = form.querySelectorAll('.array-of-objects');
        arrayOfObjectsContainers.forEach(container => {
            const fieldName = container.dataset.fieldName;
            const field = this.currentConfig.fields.find(f => f.name === fieldName);
            if (!field || field.type !== 'array-of-objects') return;
            
            // Only get direct array items, not nested ones (nested ones are inside .array-container)
            const itemsContainer = container.querySelector('.array-items');
            if (!itemsContainer) return;
            const items = itemsContainer.querySelectorAll(':scope > .array-item');
            const objects = Array.from(items).map((item) => {
                const obj = {};
                const itemIndex = parseInt(item.dataset.index) || 0;
                
                // Collect all properties from the field definition
                if (field.itemProperties) {
                    field.itemProperties.forEach(prop => {
                        if (prop.type === 'array') {
                            // Find nested array container within this item
                            const arrayContainer = item.querySelector(`.array-container[data-field-name="${prop.name}"]`);
                            if (arrayContainer) {
                                const arrayItems = arrayContainer.querySelectorAll('.array-item input');
                                const arrayValues = Array.from(arrayItems).map(input => {
                                    const val = input.value.trim();
                                    return val || undefined;
                                }).filter(v => v !== undefined);
                                if (arrayValues.length > 0) {
                                    obj[prop.name] = arrayValues;
                                } else {
                                    // Include empty arrays
                                    obj[prop.name] = [];
                                }
                            } else {
                                // Include empty arrays even if container doesn't exist
                                obj[prop.name] = [];
                            }
                        } else {
                            // Simple property - find input with matching name pattern
                            const input = item.querySelector(`input[name="${fieldName}[${itemIndex}].${prop.name}"], textarea[name="${fieldName}[${itemIndex}].${prop.name}"], select[name="${fieldName}[${itemIndex}].${prop.name}"]`);
                            if (input) {
                                if (input.type === 'checkbox') {
                                    obj[prop.name] = input.checked;
                                } else {
                                    const val = input.value.trim();
                                    if (val) {
                                        // Convert to number if it's a number field
                                        if (prop.type === 'number') {
                                            const numVal = Number(val);
                                            obj[prop.name] = isNaN(numVal) ? val : numVal;
                                        } else {
                                            obj[prop.name] = val;
                                        }
                                    } else if (prop.default !== undefined && prop.default !== null && prop.default !== '') {
                                        obj[prop.name] = prop.default;
                                    }
                                }
                            } else if (prop.default !== undefined && prop.default !== null && prop.default !== '') {
                                obj[prop.name] = prop.default;
                            }
                        }
                    });
                }
                
                // Only return object if it has at least a name field (for groups) or at least one non-default property
                if (obj.name || Object.keys(obj).length > 0) {
                    return obj;
                }
                return null;
            }).filter(o => o !== null);
            if (objects.length > 0) {
                data[fieldName] = objects;
            }
        });

        // Collect object fields
        const objectGroups = form.querySelectorAll('.object-group');
        objectGroups.forEach(group => {
            const fieldName = group.dataset.fieldName;
            const isKeyValueMap = group.dataset.isKeyValueMap === 'true';
            const field = this.currentConfig.fields.find(f => f.name === fieldName);
            
            if (isKeyValueMap) {
                // Key-value map (like networkGroupMap)
                const map = {};
                const entries = group.querySelectorAll('.map-entries .array-item');
                entries.forEach(entry => {
                    const keyInput = entry.querySelector('.map-key-input');
                    const valueInput = entry.querySelector('.map-value-input');
                    if (keyInput && valueInput) {
                        const key = keyInput.value.trim();
                        const value = valueInput.value.trim();
                        if (key && value) {
                            // Check if value should be an array (comma-separated)
                            if (field.valueIsArray) {
                                map[key] = value.split(',').map(v => v.trim()).filter(v => v);
                            } else {
                                map[key] = value;
                            }
                        }
                    }
                });
                if (Object.keys(map).length > 0) {
                    data[fieldName] = map;
                }
            } else if (field && field.properties) {
                // Regular object with properties
                const obj = {};
                field.properties.forEach(prop => {
                    const input = group.querySelector(`[name="${prop.name}"]`);
                    if (input) {
                        if (input.type === 'checkbox') {
                            obj[prop.name] = input.checked;
                        } else {
                            const val = input.value.trim();
                            if (val) obj[prop.name] = val;
                        }
                    }
                });
                if (Object.keys(obj).length > 0) {
                    data[fieldName] = obj;
                }
            }
        });

        // Remove undefined values
        Object.keys(data).forEach(key => {
            if (data[key] === undefined || data[key] === '') {
                delete data[key];
            }
        });

        return data;
    }

    exportConfig() {
        const data = this.collectFormData();
        const json = JSON.stringify(data, null, 2);
        
        document.getElementById('exportedConfig').value = json;
        document.getElementById('exportModal').style.display = 'flex';
    }

    copyToClipboard() {
        const textarea = document.getElementById('exportedConfig');
        textarea.select();
        document.execCommand('copy');
        
        const btn = document.getElementById('copyBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }

    downloadConfig() {
        const json = document.getElementById('exportedConfig').value;
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentApp.id}-config.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    showImportModal() {
        document.getElementById('importedConfig').value = '';
        document.getElementById('importModal').style.display = 'flex';
    }

    importConfig() {
        const jsonText = document.getElementById('importedConfig').value.trim();
        
        try {
            const data = JSON.parse(jsonText);
            this.populateForm(data);
            document.getElementById('importModal').style.display = 'none';
            this.showSuccess('Configuration imported successfully!');
        } catch (error) {
            this.showError('Invalid JSON. Please check your configuration.');
        }
    }

    populateFieldElement(element, field, value, parentName = '') {
        // For array fields, the element IS the container, not a wrapper
        if (field.type === 'array') {
            // Check if element itself is the array-container
            let container = element.classList.contains('array-container') ? element : element.querySelector('.array-container');
            
            if (!container) {
                // Maybe the element is a form-group wrapper
                container = element.querySelector('.array-container');
            }
            
            if (container) {
                const itemsContainer = container.querySelector('.array-items');
                if (itemsContainer) {
                    itemsContainer.innerHTML = '';
                    
                    // Handle array value
                    if (Array.isArray(value)) {
                        // Process each item in the array
                        value.forEach((item, index) => {
                            // Ensure item is a primitive value (string or number)
                            let itemValue;
                            if (typeof item === 'string' || typeof item === 'number') {
                                itemValue = String(item);
                            } else if (Array.isArray(item)) {
                                // If item is itself an array, join it (shouldn't happen for simple arrays)
                                console.warn(`Array item at index ${index} is itself an array:`, item);
                                itemValue = item.join(', ');
                            } else {
                                // Fallback: convert to string
                                itemValue = String(item);
                            }
                            this.addArrayItem(container, field, itemValue, index);
                        });
                    } else if (typeof value === 'string') {
                        // Handle case where value might be a comma-separated string (fallback)
                        const items = value.split(',').map(v => v.trim()).filter(v => v);
                        items.forEach((item, index) => {
                            this.addArrayItem(container, field, item, index);
                        });
                    } else {
                        console.warn(`Unexpected value type for array field ${field.name}:`, typeof value, value);
                    }
                } else {
                    console.warn(`Could not find .array-items container for field ${field.name}`, element);
                }
            } else {
                console.warn(`Could not find .array-container for field ${field.name}`, element, element.className);
            }
            return;
        }
        
        const input = element.querySelector('input, textarea, select');
        
        if (!input) {
            // Handle other complex field types
            if (field.type === 'array-of-objects') {
                const container = element.querySelector('.array-of-objects');
                if (container && Array.isArray(value)) {
                    const itemsContainer = container.querySelector('.array-items');
                    if (itemsContainer) {
                        itemsContainer.innerHTML = '';
                        value.forEach((item, index) => {
                            this.addObjectItem(container, field, item, index);
                        });
                    }
                }
            } else if (field.type === 'object' && field.isKeyValueMap) {
                const group = element.querySelector('.object-group');
                if (group && typeof value === 'object' && !Array.isArray(value)) {
                    const mapContainer = group.querySelector('.key-value-map');
                    if (mapContainer) {
                        const entriesContainer = mapContainer.querySelector('.map-entries');
                        entriesContainer.innerHTML = '';
                        Object.keys(value).forEach((mapKey, index) => {
                            this.addKeyValueEntry(mapContainer, field);
                            const entry = entriesContainer.children[index];
                            const keyInput = entry.querySelector('.map-key-input');
                            const valueInput = entry.querySelector('.map-value-input');
                            if (keyInput) keyInput.value = mapKey;
                            if (valueInput) {
                                const val = value[mapKey];
                                if (Array.isArray(val)) {
                                    valueInput.value = val.join(', ');
                                } else {
                                    valueInput.value = val;
                                }
                            }
                        });
                    }
                }
            }
            return;
        }
        
        // Handle simple input types
        if (input.type === 'checkbox') {
            input.checked = value;
        } else {
            input.value = value;
        }
    }

    populateForm(data) {
        const form = document.getElementById('mainForm');
        
        Object.keys(data).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = data[key];
                } else {
                    input.value = data[key];
                }
            } else {
                // Handle nested structures
                if (Array.isArray(data[key])) {
                    // Find array container
                    const container = form.querySelector(`[data-field-name="${key}"]`);
                    if (container) {
                        // Clear existing items
                        const itemsContainer = container.querySelector('.array-items');
                        if (itemsContainer) {
                            itemsContainer.innerHTML = '';
                            
                            // Add items
                            const field = this.currentConfig.fields.find(f => f.name === key);
                            if (field) {
                                data[key].forEach((item, index) => {
                                    if (field.type === 'array-of-objects') {
                                        this.addObjectItem(container, field, item, index);
                                    } else {
                                        this.addArrayItem(container, field, item, index);
                                    }
                                });
                            }
                        }
                    }
                } else if (typeof data[key] === 'object' && !Array.isArray(data[key])) {
                    // Handle object fields
                    const group = form.querySelector(`[data-field-name="${key}"]`);
                    if (group) {
                        const isKeyValueMap = group.dataset.isKeyValueMap === 'true';
                        if (isKeyValueMap) {
                            // Key-value map
                            const mapContainer = group.querySelector('.key-value-map');
                            if (mapContainer) {
                                const entriesContainer = mapContainer.querySelector('.map-entries');
                                entriesContainer.innerHTML = '';
                                const field = this.currentConfig.fields.find(f => f.name === key);
                                Object.keys(data[key]).forEach((mapKey, index) => {
                                    this.addKeyValueEntry(mapContainer, field);
                                    const entry = entriesContainer.children[index];
                                    const keyInput = entry.querySelector('.map-key-input');
                                    const valueInput = entry.querySelector('.map-value-input');
                                    if (keyInput) keyInput.value = mapKey;
                                    if (valueInput) {
                                        const value = data[key][mapKey];
                                        // Handle array values
                                        if (Array.isArray(value)) {
                                            valueInput.value = value.join(', ');
                                        } else {
                                            valueInput.value = value;
                                        }
                                    }
                                });
                            }
                        } else {
                            // Regular object
                            Object.keys(data[key]).forEach(propKey => {
                                const propInput = group.querySelector(`[name="${propKey}"]`);
                                if (propInput) {
                                    if (propInput.type === 'checkbox') {
                                        propInput.checked = data[key][propKey];
                                    } else {
                                        propInput.value = data[key][propKey];
                                    }
                                }
                            });
                        }
                    }
                }
            }
        });
    }

    resetForm() {
        if (confirm('Are you sure you want to reset the form? All changes will be lost.')) {
            this.renderForm();
        }
    }

    showError(message) {
        const form = document.getElementById('mainForm');
        const error = document.createElement('div');
        error.className = 'error-message';
        error.textContent = message;
        form.insertBefore(error, form.firstChild);
        setTimeout(() => error.remove(), 5000);
    }

    showSuccess(message) {
        const form = document.getElementById('mainForm');
        const success = document.createElement('div');
        success.className = 'success-message';
        success.textContent = message;
        form.insertBefore(success, form.firstChild);
        setTimeout(() => success.remove(), 3000);
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AppConfigurator();
});

