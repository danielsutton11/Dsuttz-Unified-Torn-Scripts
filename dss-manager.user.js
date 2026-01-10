// ==UserScript==
// @name         DSS: Unified Script Manager
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Unified manager for all DSS (Dsuttz) Torn scripts with easy enable/disable controls
// @author       Dsuttz [1561637]
// @match        https://www.torn.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @icon         https://raw.githubusercontent.com/danielsutton11/Dsuttz-Unified-Torn-Scripts/main/assets/nut_final.gif
// @homepage     https://github.com/danielsutton11/Dsuttz-Unified-Torn-Scripts
// @supportURL   https://github.com/danielsutton11/Dsuttz-Unified-Torn-Scripts/issues
// @downloadURL  https://raw.githubusercontent.com/danielsutton11/Dsuttz-Unified-Torn-Scripts/main/dss-manager.user.js
// @updateURL    https://raw.githubusercontent.com/danielsutton11/Dsuttz-Unified-Torn-Scripts/main/dss-manager.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================================
    // CONFIGURATION
    // ============================================================================
    
    const DSS_VERSION = '1.0.0';
    const SETTINGS_STORAGE_KEY = 'dss_settings';
    const MODULES_STORAGE_KEY = 'dss_modules';
    
    // ============================================================================
    // MODULE DEFINITIONS
    // ============================================================================
    
    const AVAILABLE_MODULES = {
        'crime-prioritiser': {
            id: 'crime-prioritiser',
            name: 'Crime Role Prioritiser',
            description: 'Reorders organized crime roles by priority with color-coded borders and tooltips',
            version: '1.1',
            enabled: false,
            matches: ['*/factions.php*'],
            settings: {},
            githubUrl: 'https://raw.githubusercontent.com/danielsutton11/Dsuttz-Unified-Torn-Scripts/main/modules/crime-prioritiser.module.js',
            init: null // Will be loaded from GitHub
        },
        'faction-money': {
            id: 'faction-money',
            name: 'Faction Money Transfers',
            description: 'Quick faction money transfer tools',
            version: '1.0',
            enabled: false,
            matches: ['*/factions.php*'],
            settings: {},
            init: null
        },
        'faction-family': {
            id: 'faction-family',
            name: 'Faction Family Buttons',
            description: 'Adds quick access buttons for faction family management',
            version: '1.0',
            enabled: false,
            matches: ['*/factions.php*'],
            settings: {},
            init: null
        },
        'comm-helper': {
            id: 'comm-helper',
            name: 'Communication Helper',
            description: 'Enhanced communication tools for Fallen X faction',
            version: '1.0',
            enabled: false,
            matches: ['*/messages.php*', '*/forums.php*'],
            settings: {},
            init: null
        },
        'apht-abo': {
            id: 'apht-abo',
            name: 'APHT ABO',
            description: 'APHT ABO functionality',
            version: '1.0',
            enabled: false,
            matches: ['*/gym.php*'],
            settings: {},
            init: null
        },
        'custom-background': {
            id: 'custom-background',
            name: 'Custom Background',
            description: 'Set custom background images for Torn',
            version: '1.0',
            enabled: false,
            matches: ['*'],
            settings: {
                backgroundUrl: '',
                opacity: 0.3
            },
            init: null
        },
        'chain-monitor': {
            id: 'chain-monitor',
            name: 'Chain Timeout Monitor',
            description: 'Monitors and alerts for faction chain timeouts',
            version: '1.0',
            enabled: false,
            matches: ['*/factions.php*'],
            settings: {
                alertSound: true,
                alertTime: 30
            },
            init: null
        }
    };

    // ============================================================================
    // STORAGE MANAGER
    // ============================================================================
    
    const Storage = {
        get(key, defaultValue = null) {
            try {
                const value = GM_getValue(key);
                return value !== undefined ? JSON.parse(value) : defaultValue;
            } catch (e) {
                console.error('[DSS] Storage get error:', e);
                return defaultValue;
            }
        },
        
        set(key, value) {
            try {
                GM_setValue(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('[DSS] Storage set error:', e);
                return false;
            }
        },
        
        delete(key) {
            try {
                GM_deleteValue(key);
                return true;
            } catch (e) {
                console.error('[DSS] Storage delete error:', e);
                return false;
            }
        },
        
        getSettings() {
            return this.get(SETTINGS_STORAGE_KEY, {
                apiKey: '',
                darkMode: false,
                notifications: true
            });
        },
        
        setSettings(settings) {
            return this.set(SETTINGS_STORAGE_KEY, settings);
        },
        
        getModuleStates() {
            return this.get(MODULES_STORAGE_KEY, {});
        },
        
        setModuleStates(states) {
            return this.set(MODULES_STORAGE_KEY, states);
        },
        
        getModuleState(moduleId) {
            const states = this.getModuleStates();
            return states[moduleId] || { enabled: false, settings: {} };
        },
        
        setModuleState(moduleId, state) {
            const states = this.getModuleStates();
            states[moduleId] = state;
            return this.setModuleStates(states);
        }
    };

    // ============================================================================
    // MODULE LOADER
    // ============================================================================
    
    const ModuleLoader = {
        loadedModules: {},
        moduleCache: {}, // Cache loaded module code
        
        shouldLoadModule(module) {
            const currentUrl = window.location.href;
            const state = Storage.getModuleState(module.id);
            
            if (!state.enabled) return false;
            
            // Check if current page matches module's URL patterns
            return module.matches.some(pattern => {
                const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                return regex.test(currentUrl);
            });
        },
        
        async fetchModule(module) {
            // Check if we have it cached
            if (this.moduleCache[module.id]) {
                return this.moduleCache[module.id];
            }
            
            if (!module.githubUrl) {
                console.warn(`[DSS] Module ${module.id} has no GitHub URL`);
                return null;
            }
            
            try {
                console.log(`[DSS] Fetching module from: ${module.githubUrl}`);
                const response = await fetch(module.githubUrl);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const code = await response.text();
                
                // Cache it
                this.moduleCache[module.id] = code;
                
                return code;
            } catch (error) {
                console.error(`[DSS] Failed to fetch module ${module.id}:`, error);
                return null;
            }
        },
        
        executeModuleCode(module, code) {
            try {
                // Create a wrapper to extract the module object
                const wrappedCode = `
                    (function() {
                        ${code}
                        return typeof CrimePrioritiserModule !== 'undefined' ? CrimePrioritiserModule : null;
                    })();
                `;
                
                // Execute the code and get the module object
                const moduleObj = eval(wrappedCode);
                
                if (!moduleObj || !moduleObj.init) {
                    throw new Error('Module did not export a valid init function');
                }
                
                // Store the init function
                module.init = moduleObj.init;
                
                return true;
            } catch (error) {
                console.error(`[DSS] Failed to execute module ${module.id}:`, error);
                return false;
            }
        },
        
        async loadModule(module) {
            if (this.loadedModules[module.id]) {
                console.log(`[DSS] Module ${module.id} already loaded`);
                return;
            }
            
            // If module doesn't have init function, fetch it from GitHub
            if (!module.init && module.githubUrl) {
                const code = await this.fetchModule(module);
                
                if (!code) {
                    console.error(`[DSS] Could not load module ${module.id}`);
                    return;
                }
                
                const executed = this.executeModuleCode(module, code);
                
                if (!executed) {
                    console.error(`[DSS] Could not execute module ${module.id}`);
                    return;
                }
            }
            
            if (!module.init) {
                console.warn(`[DSS] Module ${module.id} has no init function`);
                return;
            }
            
            try {
                const state = Storage.getModuleState(module.id);
                module.init(state.settings || {});
                this.loadedModules[module.id] = true;
                console.log(`[DSS] Loaded module: ${module.name}`);
            } catch (e) {
                console.error(`[DSS] Error loading module ${module.id}:`, e);
            }
        },
        
        async loadAllModules() {
            const modulesToLoad = Object.values(AVAILABLE_MODULES).filter(module => 
                this.shouldLoadModule(module)
            );
            
            // Load modules sequentially to avoid race conditions
            for (const module of modulesToLoad) {
                await this.loadModule(module);
            }
        }
    };

    // ============================================================================
    // UI MANAGER
    // ============================================================================
    
    const UI = {
        addSidebarButton() {
            // Wait for sidebar to load
            const checkSidebar = setInterval(() => {
                // Find the last navigation item (Calendar)
                const calendarNav = document.querySelector('.area-desktop___bpqAS#nav-calendar');
                
                if (calendarNav) {
                    clearInterval(checkSidebar);
                    
                    // Create DSS button
                    const dssButton = document.createElement('div');
                    dssButton.className = 'area-desktop___bpqAS';
                    dssButton.id = 'nav-dss-scripts';
                    dssButton.innerHTML = `
                        <div class="area-row___iBD8N">
                            <a href="#/dss/settings" class="desktopLink___SG2RU dss-manager-link">
                                <span class="svgIconWrap___AMIqR">
                                    <span class="defaultIcon___iiNis mobile___paLva">
                                        <img src="https://raw.githubusercontent.com/danielsutton11/Dsuttz-Unified-Torn-Scripts/main/assets/nut_final.gif" 
                                             alt="DSS" 
                                             style="width: 17px; height: 14px; image-rendering: auto;"
                                             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 16 16%22 fill=%22%23777%22%3E%3Ccircle cx=%228%22 cy=%228%22 r=%227%22 fill=%22%23667eea%22 opacity=%220.2%22/%3E%3Ctext x=%228%22 y=%2211%22 text-anchor=%22middle%22 font-size=%2210%22 font-weight=%22bold%22 fill=%22%23667eea%22%3ED%3C/text%3E%3C/svg%3E';">
                                    </span>
                                </span>
                                <span class="linkName___FoKha">Dsuttz Scripts</span>
                            </a>
                        </div>
                    `;
                    
                    // Add minimal custom styles - just the purple bar
                    const buttonStyles = document.createElement('style');
                    buttonStyles.id = 'dss-nav-styles';
                    buttonStyles.textContent = `
                        #nav-dss-scripts {
                            border-left: 3px solid #667eea;
                        }
                    `;
                    document.head.appendChild(buttonStyles);
                    
                    // Insert after calendar (at the bottom)
                    calendarNav.parentNode.insertBefore(dssButton, calendarNav.nextSibling);
                    
                    // Add click handler
                    dssButton.querySelector('a').addEventListener('click', (e) => {
                        e.preventDefault();
                        this.openSettingsPage();
                    });
                    
                    console.log('[DSS] Sidebar button added');
                }
            }, 500);
            
            // Timeout after 10 seconds
            setTimeout(() => clearInterval(checkSidebar), 10000);
        },
        
        openSettingsPage() {
            // Check if we're already on the settings page
            if (window.location.hash === '#/dss/settings') {
                return;
            }
            
            // Navigate to settings page
            window.location.hash = '#/dss/settings';
            
            // Render settings page
            setTimeout(() => this.renderSettingsPage(), 100);
        },
        
        renderSettingsPage() {
            // Find main content area
            const contentWrapper = document.querySelector('.content-wrapper[role="main"]');
            if (!contentWrapper) {
                console.error('[DSS] Could not find content wrapper');
                return;
            }
            
            // Clear existing content
            contentWrapper.innerHTML = '';
            
            // Create settings page
            const settings = Storage.getSettings();
            const moduleStates = Storage.getModuleStates();
            
            contentWrapper.innerHTML = `
                <div class="dss-settings-page">
                    <div class="content-title m-bottom10">
                        <h4 class="left">DSS Script Manager</h4>
                        <div class="clear"></div>
                        <hr class="page-head-delimiter">
                    </div>
                    
                    <div class="content m-top10">
                        <!-- Global Settings -->
                        <div class="dss-section">
                            <div class="title main-title title-black top-round">
                                <h5>Global Settings</h5>
                            </div>
                            <div class="cont-gray bottom-round">
                                <div class="dss-setting-row">
                                    <label>Torn API Key:</label>
                                    <input type="text" id="dss-api-key" value="${settings.apiKey || ''}" 
                                           placeholder="Enter your Torn API key" class="dss-input">
                                    <button id="dss-save-api" class="torn-btn">Save</button>
                                </div>
                                <div class="dss-setting-row">
                                    <label>Enable Notifications:</label>
                                    <input type="checkbox" id="dss-notifications" ${settings.notifications ? 'checked' : ''}>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Modules -->
                        <div class="dss-section m-top10">
                            <div class="title main-title title-black top-round">
                                <h5>Available Modules (${Object.keys(AVAILABLE_MODULES).length})</h5>
                            </div>
                            <div class="cont-gray bottom-round">
                                <div id="dss-modules-list">
                                    ${this.renderModulesList(moduleStates)}
                                </div>
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div class="dss-footer m-top10">
                            <p>DSS Script Manager v${DSS_VERSION}</p>
                            <p>Created by <a href="/profiles.php?XID=1561637" class="t-blue">Dsuttz [1561637]</a></p>
                        </div>
                    </div>
                </div>
            `;
            
            // Add styles
            this.injectStyles();
            
            // Attach event listeners
            this.attachSettingsListeners();
            
            console.log('[DSS] Settings page rendered');
        },
        
        renderModulesList(moduleStates) {
            return Object.values(AVAILABLE_MODULES).map(module => {
                const state = moduleStates[module.id] || { enabled: false };
                return `
                    <div class="dss-module-card ${state.enabled ? 'enabled' : ''}">
                        <div class="dss-module-header">
                            <div class="dss-module-info">
                                <h6>${module.name}</h6>
                                <span class="dss-module-version">v${module.version}</span>
                            </div>
                            <label class="dss-toggle">
                                <input type="checkbox" 
                                       class="dss-module-toggle" 
                                       data-module-id="${module.id}"
                                       ${state.enabled ? 'checked' : ''}>
                                <span class="dss-toggle-slider"></span>
                            </label>
                        </div>
                        <div class="dss-module-description">
                            ${module.description}
                        </div>
                        ${Object.keys(module.settings).length > 0 ? `
                            <div class="dss-module-settings">
                                <button class="dss-module-settings-btn" data-module-id="${module.id}">
                                    Configure
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        },
        
        attachSettingsListeners() {
            // Save API key
            document.getElementById('dss-save-api')?.addEventListener('click', () => {
                const apiKey = document.getElementById('dss-api-key').value.trim();
                const settings = Storage.getSettings();
                settings.apiKey = apiKey;
                Storage.setSettings(settings);
                alert('API key saved!');
            });
            
            // Notifications toggle
            document.getElementById('dss-notifications')?.addEventListener('change', (e) => {
                const settings = Storage.getSettings();
                settings.notifications = e.target.checked;
                Storage.setSettings(settings);
            });
            
            // Module toggles
            document.querySelectorAll('.dss-module-toggle').forEach(toggle => {
                toggle.addEventListener('change', (e) => {
                    const moduleId = e.target.getAttribute('data-module-id');
                    const enabled = e.target.checked;
                    
                    const state = Storage.getModuleState(moduleId);
                    state.enabled = enabled;
                    Storage.setModuleState(moduleId, state);
                    
                    // Update card appearance
                    const card = e.target.closest('.dss-module-card');
                    if (enabled) {
                        card.classList.add('enabled');
                    } else {
                        card.classList.remove('enabled');
                    }
                    
                    console.log(`[DSS] Module ${moduleId} ${enabled ? 'enabled' : 'disabled'}`);
                });
            });
        },
        
        injectStyles() {
            if (document.getElementById('dss-styles')) return;
            
            const styles = document.createElement('style');
            styles.id = 'dss-styles';
            styles.textContent = `
                .dss-settings-page {
                    max-width: 1200px;
                    margin: 0 auto;
                }
                
                .dss-section {
                    margin-bottom: 20px;
                }
                
                .dss-setting-row {
                    padding: 15px;
                    border-bottom: 1px solid #ddd;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .dss-setting-row:last-child {
                    border-bottom: none;
                }
                
                .dss-setting-row label {
                    min-width: 200px;
                    font-weight: bold;
                }
                
                .dss-input {
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    font-size: 14px;
                }
                
                .dss-module-card {
                    padding: 20px;
                    border-bottom: 1px solid #ddd;
                    transition: background-color 0.3s;
                }
                
                .dss-module-card:hover {
                    background-color: #f5f5f5;
                }
                
                .dss-module-card.enabled {
                    background-color: #e8f5e9;
                }
                
                .dss-module-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }
                
                .dss-module-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .dss-module-info h6 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: bold;
                }
                
                .dss-module-version {
                    font-size: 12px;
                    color: #777;
                    background: #eee;
                    padding: 2px 8px;
                    border-radius: 10px;
                }
                
                .dss-module-description {
                    color: #666;
                    font-size: 14px;
                    margin-bottom: 10px;
                }
                
                .dss-toggle {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 24px;
                }
                
                .dss-toggle input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .dss-toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    transition: 0.4s;
                    border-radius: 24px;
                }
                
                .dss-toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.4s;
                    border-radius: 50%;
                }
                
                .dss-toggle input:checked + .dss-toggle-slider {
                    background-color: #4CAF50;
                }
                
                .dss-toggle input:checked + .dss-toggle-slider:before {
                    transform: translateX(26px);
                }
                
                .dss-module-settings {
                    margin-top: 10px;
                }
                
                .dss-module-settings-btn {
                    padding: 6px 12px;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
                
                .dss-module-settings-btn:hover {
                    background: #5568d3;
                }
                
                .dss-footer {
                    text-align: center;
                    padding: 20px;
                    color: #777;
                    font-size: 14px;
                }
                
                .dss-footer p {
                    margin: 5px 0;
                }
            `;
            document.head.appendChild(styles);
        }
    };

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    
    async function init() {
        console.log(`[DSS] Initializing Script Manager v${DSS_VERSION}`);
        
        // Add sidebar button
        UI.addSidebarButton();
        
        // Check if we're on the settings page
        if (window.location.hash === '#/dss/settings') {
            UI.renderSettingsPage();
        }
        
        // Listen for hash changes
        window.addEventListener('hashchange', () => {
            if (window.location.hash === '#/dss/settings') {
                UI.renderSettingsPage();
            }
        });
        
        // Load enabled modules
        await ModuleLoader.loadAllModules();
        
        console.log('[DSS] Initialization complete');
    }

    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();