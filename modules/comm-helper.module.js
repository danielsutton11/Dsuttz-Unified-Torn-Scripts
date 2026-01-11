// Communication Helper Module for DSS Manager
// Version: 0.89
// This module can be loaded by the DSS Manager from GitHub

const CommHelperModule = {
    id: 'comm-helper',
    name: 'Communication Helper',
    version: '0.89',
    
    // Module initialization function
    init(settings = {}) {
        console.log('[Comm Helper] Initializing...');
        
        // Prevent multiple instances
        if (window.tornCommHelperLoaded) {
            console.log('[Comm Helper] Already loaded, skipping...');
            return;
        }
        window.tornCommHelperLoaded = true;
        
        // ==== CONFIGURATION ====
        // Get settings from DSS manager or use defaults
        const RECRUITMENT_PASTEBIN_URL = settings.recruitmentUrl || 'https://pastebin.com/raw/fufBfirF';
        const WELCOME_PASTEBIN_URL = settings.welcomeUrl || 'https://pastebin.com/raw/0FHiHh1z';
        const WAR_PASTEBIN_URL = settings.warUrl || 'https://pastebin.com/raw/esK4RdZm';
        const OTHER_PASTEBIN_URL = settings.otherUrl || 'https://pastebin.com/raw/BcXXwuEs';

        // Get API key from DSS manager settings
        const Storage = {
            getSettings() {
                const value = GM_getValue('dss_settings');
                return value ? JSON.parse(value) : { apiKey: '' };
            }
        };
        
        const managerSettings = Storage.getSettings();
        let TORN_API_KEY = managerSettings.apiKey;

        if (!TORN_API_KEY) {
            console.warn('[Comm Helper] No API key found in DSS Settings');
            const text = 'Communication Helper:\n\nNo API key found in DSS Settings.\n\n' +
                'Please set your API key in DSS Settings first.';
            alert(text);
            return;
        }

        // HTML templates (will be loaded from Pastebin)
        let recruitmentHTML = '';
        let welcomeHTML = '';
        let warHTML = '';
        let otherHTML = '';

        // Add CSS animations to the page
        const animationCSS = `
<style>
@keyframes slideInFromRight {
    0% {
        transform: translateX(50px);
        opacity: 0;
    }
    100% {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes fadeInScale {
    0% {
        transform: scale(0.8);
        opacity: 0;
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

.button-animate-slide {
    animation: slideInFromRight 0.4s ease-out;
}

.button-animate-scale {
    animation: fadeInScale 0.3s ease-out;
}

/* Responsive button container */
@media (max-width: 768px) {
    .mobile-button-container {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 5px !important;
        margin: 10px 0 0 10px !important;
        clear: both !important;
        width: calc(100% - 10px) !important;
    }

    .mobile-button-container button {
        flex: 0 0 auto !important;
        margin: 0 !important;
    }
}

@media (min-width: 769px) {
    .desktop-button-container {
        display: inline !important;
    }
}
</style>
`;

        // Add the CSS to the page
        document.head.insertAdjacentHTML('beforeend', animationCSS);

        // Function to fetch HTML from Pastebin
        function fetchFromPastebin(url, name) {
            return new Promise((resolve) => {
                console.log(`[Comm Helper] Fetching ${name} from Pastebin...`);

                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url + '?t=' + Date.now(),
                    onload: function(response) {
                        if (response.status === 200) {
                            console.log(`[Comm Helper] Successfully loaded ${name}`);
                            resolve(response.responseText);
                        } else {
                            console.error(`[Comm Helper] Failed to fetch ${name}:`, response.status);
                            resolve('');
                        }
                    },
                    onerror: function(error) {
                        console.error(`[Comm Helper] Error fetching ${name}:`, error);
                        resolve('');
                    },
                    ontimeout: function() {
                        console.error(`[Comm Helper] Timeout fetching ${name}`);
                        resolve('');
                    }
                });
            });
        }

        // Fetch functions for each template
        async function fetchRecruitmentHTML() {
            recruitmentHTML = await fetchFromPastebin(RECRUITMENT_PASTEBIN_URL, 'recruitment HTML');
            return !!recruitmentHTML;
        }

        async function fetchWelcomeHTML() {
            welcomeHTML = await fetchFromPastebin(WELCOME_PASTEBIN_URL, 'welcome HTML');
            return !!welcomeHTML;
        }

        async function fetchWarHTML() {
            warHTML = await fetchFromPastebin(WAR_PASTEBIN_URL, 'war HTML');
            return !!warHTML;
        }

        async function fetchOtherHTML() {
            otherHTML = await fetchFromPastebin(OTHER_PASTEBIN_URL, 'other HTML');
            return !!otherHTML;
        }

        // Mobile detection
        function isMobileDevice() {
            const currentWidth = window.innerWidth;
            const mobileUserAgents = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
            const isMobileUA = mobileUserAgents.test(navigator.userAgent);
            const isMobileWidth = currentWidth <= 768;
            const isTouchDevice = 'ontouchstart' in window;
            
            return isMobileWidth || isMobileUA || isTouchDevice;
        }

        // Get war data from API
        function getWarData() {
            return new Promise((resolve) => {
                if (!TORN_API_KEY) {
                    resolve(null);
                    return;
                }

                GM_xmlhttpRequest({
                    method: 'GET',
                    url: `https://api.torn.com/v2/faction/wars?key=${TORN_API_KEY}`,
                    timeout: 10000,
                    onload: function(response) {
                        if (response.status === 200) {
                            try {
                                const data = JSON.parse(response.responseText);
                                if (data.error) {
                                    console.error('[Comm Helper] API error:', data.error);
                                    resolve(null);
                                    return;
                                }
                                resolve(data);
                            } catch (error) {
                                console.error('[Comm Helper] Error parsing war data:', error);
                                resolve(null);
                            }
                        } else {
                            console.error('[Comm Helper] Failed to fetch war data:', response.status);
                            resolve(null);
                        }
                    },
                    onerror: () => resolve(null),
                    ontimeout: () => resolve(null)
                });
            });
        }

        // Get current user data
        function getCurrentUserData() {
            return new Promise((resolve, reject) => {
                if (!TORN_API_KEY) {
                    reject('Invalid API key');
                    return;
                }

                GM_xmlhttpRequest({
                    method: 'GET',
                    url: 'https://api.torn.com/user/?selections=&key=' + TORN_API_KEY,
                    timeout: 10000,
                    onload: function(response) {
                        if (response.status === 200) {
                            try {
                                const data = JSON.parse(response.responseText);
                                if (data.error) {
                                    reject('API Error: ' + data.error.error);
                                    return;
                                }
                                resolve({
                                    name: data.name,
                                    role: data.faction?.position || ''
                                });
                            } catch (error) {
                                reject('Error parsing API response: ' + error.message);
                            }
                        } else {
                            reject('Failed to fetch user data: HTTP ' + response.status);
                        }
                    },
                    onerror: () => reject('Network error'),
                    ontimeout: () => reject('Request timed out')
                });
            });
        }

        // Get current faction data
        function getCurrentFactionData() {
            return new Promise((resolve) => {
                if (!TORN_API_KEY) {
                    resolve(null);
                    return;
                }

                GM_xmlhttpRequest({
                    method: 'GET',
                    url: `https://api.torn.com/v2/faction/basic?key=${TORN_API_KEY}`,
                    timeout: 10000,
                    onload: function(response) {
                        if (response.status === 200) {
                            try {
                                const data = JSON.parse(response.responseText);
                                if (data.error) {
                                    console.error('[Comm Helper] Faction API error:', data.error);
                                    resolve(null);
                                    return;
                                }
                                resolve(data.basic);
                            } catch (error) {
                                console.error('[Comm Helper] Error parsing faction data:', error);
                                resolve(null);
                            }
                        } else {
                            resolve(null);
                        }
                    },
                    onerror: () => resolve(null),
                    ontimeout: () => resolve(null)
                });
            });
        }

        // Format date functions
        function formatDate(timestamp) {
            const date = new Date(timestamp * 1000);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const months = ['January', 'February', 'March', 'April', 'May', 'June',
                            'July', 'August', 'September', 'October', 'November', 'December'];

            const dayOfWeek = days[date.getUTCDay()];
            const day = date.getUTCDate();
            const month = months[date.getUTCMonth()];
            const hours = date.getUTCHours();
            const minutes = date.getUTCMinutes();

            const getOrdinalSuffix = (day) => {
                if (day > 3 && day < 21) return 'th';
                switch (day % 10) {
                    case 1: return 'st';
                    case 2: return 'nd';
                    case 3: return 'rd';
                    default: return 'th';
                }
            };

            const dayWithSuffix = day + getOrdinalSuffix(day);
            const timeString = hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ' TCT';

            return timeString + ' on ' + dayOfWeek + ', ' + dayWithSuffix + ' of ' + month;
        }

        function formatSubjectDate(timestamp) {
            const date = new Date(timestamp * 1000);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayOfWeek = days[date.getUTCDay()];
            const day = date.getUTCDate();
            const hours = date.getUTCHours();
            const minutes = date.getUTCMinutes();

            const getOrdinalSuffix = (day) => {
                if (day > 3 && day < 21) return 'th';
                switch (day % 10) {
                    case 1: return 'st';
                    case 2: return 'nd';
                    case 3: return 'rd';
                    default: return 'th';
                }
            };

            const dayWithSuffix = day + getOrdinalSuffix(day);
            const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const timeString = hour12 + ':' + minutes.toString().padStart(2, '0') + ' ' + ampm;

            return dayOfWeek + ' ' + dayWithSuffix + ' - ' + timeString + ' TCT';
        }

        function getDayOfWeek(timestamp) {
            const date = new Date(timestamp * 1000);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return days[date.getUTCDay()];
        }

        // Extract username from input
        function extractUsername() {
            const userInput = document.querySelector('input[name="sendto"]');
            if (userInput && userInput.value) {
                const match = userInput.value.match(/^([^[]+)/);
                return match ? match[1].trim() : userInput.value;
            }
            return null;
        }

        // Toggle source editor
        function toggleSourceEditor() {
            const sourceButton = document.querySelector('svg[fill="#00a3d9"]') || document.querySelector('svg path[fill="#00a3d9"]');
            if (sourceButton) {
                let clickableElement = sourceButton;
                while (clickableElement && !clickableElement.onclick && clickableElement.tagName !== 'BUTTON') {
                    clickableElement = clickableElement.parentElement;
                }
                if (clickableElement) {
                    clickableElement.click();
                }
            }
        }

        // Insert content into editor
        function insertContentIntoEditor(content, contentType) {
            toggleSourceEditor();

            setTimeout(function() {
                const editorFrame = document.querySelector('iframe[id*="mce"]');
                let editorDoc = null;

                if (editorFrame) {
                    editorDoc = editorFrame.contentDocument || editorFrame.contentWindow.document;
                }

                if (editorDoc && editorDoc.body) {
                    console.log('[Comm Helper] Found TinyMCE editor, inserting', contentType, 'content');
                    editorDoc.body.innerHTML = content;
                    const changeEvent = new Event('input', { bubbles: true });
                    editorDoc.body.dispatchEvent(changeEvent);
                } else {
                    const editableDiv = document.querySelector('[contenteditable="true"]') ||
                          document.querySelector('.mce-content-body');

                    if (editableDiv) {
                        console.log('[Comm Helper] Found contenteditable div, inserting', contentType, 'content');
                        editableDiv.innerHTML = content;
                        const changeEvent = new Event('input', { bubbles: true });
                        editableDiv.dispatchEvent(changeEvent);
                    } else {
                        const textarea = document.querySelector('textarea');
                        if (textarea) {
                            console.log('[Comm Helper] Found textarea, inserting', contentType, 'content');
                            textarea.value = content;
                            const event = new Event('input', { bubbles: true });
                            textarea.dispatchEvent(event);
                        } else {
                            alert('Could not find editor to insert content');
                        }
                    }
                }
            }, 0);
        }

        // Show war details popup
        function showWarDetailsPopup() {
            return new Promise((resolve) => {
                const isMobile = isMobileDevice();
                const popupWidth = isMobile ? 'calc(100vw - 40px)' : '450px';
                const popupMaxWidth = isMobile ? 'calc(100vw - 40px)' : '500px';
                const popupMinWidth = isMobile ? 'auto' : '450px';
                const popupPadding = isMobile ? '15px' : '25px';
                const fontSize = isMobile ? '14px' : '14px';
                const inputFontSize = isMobile ? '16px' : '14px';
                const headerFontSize = isMobile ? '18px' : '20px';
                const buttonPadding = isMobile ? '10px 20px' : '12px 24px';
                const marginBottom = isMobile ? '15px' : '20px';

                const popupHTML = `
    <div id="war-popup" style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #f8f9fa;
        border: 3px solid #00a1c7;
        border-radius: 12px;
        padding: ${popupPadding};
        z-index: 999999;
        width: ${popupWidth};
        max-width: ${popupMaxWidth};
        min-width: ${popupMinWidth};
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        font-family: Arial, sans-serif;
        box-sizing: border-box;
    ">
        <h3 style="
            margin-top: 0;
            margin-bottom: ${marginBottom};
            color: #00a1c7;
            font-size: ${headerFontSize};
            text-align: center;
            border-bottom: 2px solid #00a1c7;
            padding-bottom: 10px;
        ">
            War Details
        </h3>

        <div style="margin-bottom: ${marginBottom};">
            <label style="
                display: block;
                margin-bottom: 8px;
                font-weight: bold;
                color: #333;
                font-size: ${fontSize};
            ">
                Discord Availability Poll URL:
            </label>
            <input type="url" id="poll-url" style="
                width: 100%;
                padding: ${isMobile ? '10px' : '12px'};
                border: 2px solid #ddd;
                border-radius: 6px;
                font-size: ${inputFontSize};
                box-sizing: border-box;
            " placeholder="https://discord.com/channels/...">
        </div>

        <div style="margin-bottom: ${marginBottom};">
            <label style="
                display: block;
                margin-bottom: 8px;
                font-weight: bold;
                color: #333;
                font-size: ${fontSize};
            ">
                Enemy Stats Details Discord Message URL:
            </label>
            <input type="url" id="stats-url" style="
                width: 100%;
                padding: ${isMobile ? '10px' : '12px'};
                border: 2px solid #ddd;
                border-radius: 6px;
                font-size: ${inputFontSize};
                box-sizing: border-box;
            " placeholder="https://discord.com/channels/...">
        </div>

        <div style="margin-bottom: 25px;">
            <label style="
                display: block;
                margin-bottom: 8px;
                font-weight: bold;
                color: #333;
                font-size: ${fontSize};
            ">
                Xanax Available Date & Time (TCT):
            </label>
            <input type="datetime-local" id="xanax-datetime" style="
                width: ${isMobile ? '93%' : '100%'};
                padding: ${isMobile ? '10px' : '12px'};
                border: 2px solid #ddd;
                border-radius: 6px;
                font-size: ${inputFontSize};
                box-sizing: border-box;
            ">
        </div>

        <div style="
            text-align: right;
            border-top: 2px solid #eee;
            padding-top: ${marginBottom};
        ">
            <button id="popup-cancel" style="
                background: #dc3545;
                color: white;
                border: none;
                padding: ${buttonPadding};
                border-radius: 6px;
                margin-right: ${isMobile ? '10px' : '15px'};
                cursor: pointer;
                font-size: ${fontSize};
                font-weight: bold;
                touch-action: manipulation;
            ">
                Cancel
            </button>
            <button id="popup-ok" style="
                background: #00a1c7;
                color: white;
                border: none;
                padding: ${buttonPadding};
                border-radius: 6px;
                cursor: pointer;
                font-size: ${fontSize};
                font-weight: bold;
                touch-action: manipulation;
            ">
                OK
            </button>
        </div>
    </div>

    <div id="war-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.6);
        z-index: 999998;
    "></div>
`;
                document.body.insertAdjacentHTML('beforeend', popupHTML);

                document.getElementById('popup-ok').onclick = function() {
                    const pollUrl = document.getElementById('poll-url').value;
                    const statsUrl = document.getElementById('stats-url').value;
                    const xanaxDatetime = document.getElementById('xanax-datetime').value;

                    if (!pollUrl || !statsUrl || !xanaxDatetime) {
                        alert('Please fill in all fields');
                        return;
                    }

                    document.getElementById('war-popup').remove();
                    document.getElementById('war-overlay').remove();

                    const xanaxTimestamp = new Date(xanaxDatetime + 'Z').getTime() / 1000;

                    resolve({
                        pollUrl: pollUrl,
                        statsUrl: statsUrl,
                        xanaxTimestamp: xanaxTimestamp
                    });
                };

                document.getElementById('popup-cancel').onclick = function() {
                    document.getElementById('war-popup').remove();
                    document.getElementById('war-overlay').remove();
                    resolve(null);
                };

                document.getElementById('war-overlay').onclick = function() {
                    document.getElementById('war-popup').remove();
                    document.getElementById('war-overlay').remove();
                    resolve(null);
                };
            });
        }

        // Insert recruitment message
        async function insertRecruitmentMessage() {
            const username = extractUsername();
            if (!username) {
                alert('Could not extract username from the recipient field');
                return;
            }

            if (!recruitmentHTML || recruitmentHTML.trim() === '') {
                console.log('[Comm Helper] Recruitment HTML not loaded, fetching now');
                const success = await fetchRecruitmentHTML();
                if (!success) {
                    alert('Failed to load recruitment message. Please try again.');
                    return;
                }
            }

            const subjectInput = document.querySelector('input.subject[name="subject"]');
            if (subjectInput) {
                subjectInput.value = 'Not another faction recruitment message!?';
                const changeEvent = new Event('input', { bubbles: true });
                subjectInput.dispatchEvent(changeEvent);
            }

            const personalizedHTML = recruitmentHTML.replace(/\[Insert Name Here\]/g, username);
            insertContentIntoEditor(personalizedHTML, 'recruitment');
        }

        // Insert welcome message
        async function insertWelcomeMessage() {
            try {
                const loadingDiv = document.createElement('div');
                loadingDiv.id = 'welcome-loading';
                loadingDiv.innerHTML = '<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 999999;">Loading user data...</div>';
                document.body.appendChild(loadingDiv);

                const username = extractUsername();
                if (!username) {
                    const loading = document.getElementById('welcome-loading');
                    if (loading) loading.remove();
                    alert('Could not extract username from the recipient field');
                    return;
                }

                const userData = await getCurrentUserData();
                const currentUserRole = userData.role;
                const currentUserName = userData.name;

                const loading = document.getElementById('welcome-loading');
                if (loading) loading.remove();

                if (!welcomeHTML || welcomeHTML.trim() === '') {
                    console.log('[Comm Helper] Welcome HTML not loaded, fetching now');
                    const success = await fetchWelcomeHTML();
                    if (!success) {
                        alert('Failed to load welcome message. Please try again.');
                        return;
                    }
                }

                const subjectInput = document.querySelector('input.subject[name="subject"]');
                if (subjectInput) {
                    subjectInput.value = 'Welcome to the family!';
                    const changeEvent = new Event('input', { bubbles: true });
                    subjectInput.dispatchEvent(changeEvent);
                }

                let personalizedHTML = welcomeHTML
                .replace(/\[Insert Name Here\]/g, username)
                .replace(/\[Your Role\]/g, currentUserRole)
                .replace(/\[Your Name\]/g, currentUserName);

                insertContentIntoEditor(personalizedHTML, 'welcome');

            } catch (error) {
                const loading = document.getElementById('welcome-loading');
                if (loading) loading.remove();
                console.error('[Comm Helper] Error in insertWelcomeMessage:', error);
                alert('Error loading welcome message: ' + error.message);
            }
        }

        // Insert war message (newsletter)
        async function insertWarMessageNewsletter() {
            try {
                const loadingDiv = document.createElement('div');
                loadingDiv.id = 'war-loading-user';
                loadingDiv.innerHTML = '<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 999999;">Loading data...</div>';
                document.body.appendChild(loadingDiv);

                const userData = await getCurrentUserData();
                const factionData = await getCurrentFactionData();
                const warData = await getWarData();

                const loading = document.getElementById('war-loading-user');
                if (loading) loading.remove();

                if (!userData || !factionData || !warData) {
                    alert('Failed to fetch required data from API');
                    return;
                }

                const myFactionId = factionData.id;
                const enemyFaction = warData.wars.ranked.factions.find(faction => faction.id !== myFactionId);

                if (!enemyFaction) {
                    alert('Could not identify enemy faction in war data');
                    return;
                }

                const warDetails = await showWarDetailsPopup();
                if (!warDetails) {
                    return;
                }

                if (!warHTML || warHTML.trim() === '') {
                    const success = await fetchWarHTML();
                    if (!success) {
                        alert('Failed to load war message. Please try again.');
                        return;
                    }
                }

                const warStartTimestamp = warData.wars.ranked.start;
                const startDate = formatDate(warStartTimestamp);
                const xanaxStackStartTimestamp = warStartTimestamp - (32 * 60 * 60);
                const xanaxStackStart = formatDate(xanaxStackStartTimestamp);
                const xanaxStartDay = getDayOfWeek(warDetails.xanaxTimestamp);
                const xanaxAvailable = formatDate(warDetails.xanaxTimestamp);
                const subjectDate = formatSubjectDate(warStartTimestamp);

                const subjectInput = document.querySelector('input.text-input.titleField___Rtn72');
                if (subjectInput) {
                    const newSubject = '[WAR] ' + enemyFaction.name + ' - ' + subjectDate;
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    nativeInputValueSetter.call(subjectInput, newSubject);
                    const reactEvent = new Event('input', { bubbles: true });
                    subjectInput.dispatchEvent(reactEvent);
                }

                let personalizedHTML = warHTML
                .replace(/\[Your Role\]/g, userData.role)
                .replace(/\[Your Name\]/g, userData.name)
                .replace(/\[ENEMY FACTION NAME\]/g, '<a href="https://www.torn.com/factions.php?step=profile&ID=' + enemyFaction.id + '" target="_blank">' + enemyFaction.name + '</a>')
                .replace(/\[Start Date\]/g, startDate)
                .replace(/\[Xanax Stack Start\]/g, xanaxStackStart)
                .replace(/\[Xanax Available\]/g, xanaxAvailable)
                .replace(/\[Xanax Start Day]/g, xanaxStartDay);

                personalizedHTML = personalizedHTML.replace(/\bpoll\b/g, '<a href="' + warDetails.pollUrl + '" target="_blank">poll</a>');
                personalizedHTML = personalizedHTML.replace(/Enemy Stats Details/g, '<a href="' + warDetails.statsUrl + '" target="_blank">Enemy Stats Details</a>');

                const sourceButton = document.querySelector('button[aria-label="Toggle Code Editor"]');
                if (sourceButton) {
                    sourceButton.click();
                }

                setTimeout(function() {
                    let editorArea = document.querySelector('[contenteditable="true"]') ||
                        document.querySelector('.mce-content-body') ||
                        document.querySelector('[data-mce-bogus="1"]')?.parentElement ||
                        document.querySelector('iframe[id*="mce"]')?.contentDocument?.body;

                    if (editorArea) {
                        editorArea.innerHTML = personalizedHTML;
                        const changeEvent = new Event('input', { bubbles: true });
                        editorArea.dispatchEvent(changeEvent);

                        setTimeout(function() {
                            const sourceButton = document.querySelector('button[aria-label="Toggle Code Editor"]');
                            if (sourceButton) {
                                sourceButton.click();
                            }
                        }, 50);
                    } else {
                        alert('Could not find newsletter editor');
                    }
                }, 50);

            } catch (error) {
                const loading = document.getElementById('war-loading-user');
                if (loading) loading.remove();
                console.error('[Comm Helper] Error in insertWarMessageNewsletter:', error);
                alert('Error loading war message: ' + error.message);
            }
        }

        // Insert other message (newsletter)
        async function insertOtherMessageNewsletter() {
            try {
                const loadingDiv = document.createElement('div');
                loadingDiv.id = 'other-loading';
                loadingDiv.innerHTML = '<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 999999;">Loading user data...</div>';
                document.body.appendChild(loadingDiv);

                const userData = await getCurrentUserData();

                const loading = document.getElementById('other-loading');
                if (loading) loading.remove();

                if (!otherHTML || otherHTML.trim() === '') {
                    const success = await fetchOtherHTML();
                    if (!success) {
                        alert('Failed to load other message. Please try again.');
                        return;
                    }
                }

                const subjectInput = document.querySelector('input.text-input.titleField___Rtn72');
                if (subjectInput) {
                    const newSubject = 'INSERT YOUR SUBJECT!';
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    nativeInputValueSetter.call(subjectInput, newSubject);
                    const reactEvent = new Event('input', { bubbles: true });
                    subjectInput.dispatchEvent(reactEvent);
                }

                let personalizedHTML = otherHTML
                .replace(/\[Your Role\]/g, userData.role)
                .replace(/\[Your Name\]/g, userData.name);

                const sourceButton = document.querySelector('button[aria-label="Toggle Code Editor"]');
                if (sourceButton) {
                    sourceButton.click();
                }

                setTimeout(function() {
                    let editorArea = document.querySelector('[contenteditable="true"]') ||
                        document.querySelector('.mce-content-body') ||
                        document.querySelector('[data-mce-bogus="1"]')?.parentElement ||
                        document.querySelector('iframe[id*="mce"]')?.contentDocument?.body;

                    if (editorArea) {
                        editorArea.innerHTML = personalizedHTML;
                        const changeEvent = new Event('input', { bubbles: true });
                        editorArea.dispatchEvent(changeEvent);

                        setTimeout(function() {
                            const sourceButton = document.querySelector('button[aria-label="Toggle Code Editor"]');
                            if (sourceButton) {
                                sourceButton.click();
                            }
                        }, 50);
                    } else {
                        alert('Could not find newsletter editor');
                    }
                }, 50);

            } catch (error) {
                const loading = document.getElementById('other-loading');
                if (loading) loading.remove();
                console.error('[Comm Helper] Error in insertOtherMessageNewsletter:', error);
                alert('Error loading other message: ' + error.message);
            }
        }

        // Create buttons functions
        function createRecruitButton() {
            if (document.querySelector('#recruit-button')) {
                return;
            }

            let targetContainer, insertionPoint;
            const isMobile = isMobileDevice();

            if (isMobile) {
                const nameInput = document.querySelector('input[name="sendto"]') || document.querySelector('input[placeholder="Name"]');
                if (nameInput) {
                    let nameContainer = nameInput.closest('.form-title-input-text') ||
                        nameInput.closest('div') ||
                        nameInput.parentNode;

                    let mobileContainer = document.querySelector('.mobile-button-container');
                    if (!mobileContainer) {
                        mobileContainer = document.createElement('div');
                        mobileContainer.className = 'mobile-button-container';
                        mobileContainer.style.cssText = 'display: flex !important; flex-wrap: wrap !important; gap: 5px !important; margin: 10px 0 0 10px !important; clear: both !important; width: calc(100% - 10px) !important;';
                        nameContainer.parentNode.insertBefore(mobileContainer, nameContainer.nextSibling);
                    }
                    targetContainer = mobileContainer;
                    insertionPoint = null;
                } else {
                    targetContainer = document.querySelector('div.form-title-input-text:nth-child(1)');
                    const anonymousButton = document.querySelector('#anonymousButton');
                    if (anonymousButton) {
                        insertionPoint = anonymousButton.nextSibling;
                    }
                }
            } else {
                targetContainer = document.querySelector('div.form-title-input-text:nth-child(1)');
                const anonymousButton = document.querySelector('#anonymousButton');
                if (anonymousButton) {
                    insertionPoint = anonymousButton.nextSibling;
                }
            }

            if (!targetContainer) {
                targetContainer = document.querySelector('.form-container') ||
                    document.querySelector('form') ||
                    document.querySelector('div[class*="form"]');

                if (!targetContainer) {
                    return;
                }
            }

            const button = document.createElement('button');
            button.id = 'recruit-button';
            button.textContent = 'Recruit';
            button.type = 'button';

            if (isMobile) {
                button.style.cssText = 'background-color: #00a1c7 !important; color: white !important; border: none !important; padding: 8px 16px !important; border-radius: 4px !important; cursor: pointer !important; font-size: 12px !important; font-weight: bold !important; margin: 0 5px 0 0 !important; display: inline-block !important; transition: background-color 0.2s ease !important; touch-action: manipulation !important; flex: 0 0 auto !important;';
            } else {
                button.style.cssText = 'background-color: #00a1c7 !important; color: white !important; border: none !important; padding: 8px 16px !important; border-radius: 4px !important; cursor: pointer !important; font-size: 12px !important; font-weight: bold !important; margin-left: 10px !important; display: inline-block !important; vertical-align: middle !important; transition: background-color 0.2s ease !important;';
            }

            button.classList.add('button-animate-slide');
            button.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (e.target.form) {
                    e.target.form.onsubmit = function() { return false; };
                }
                await insertRecruitmentMessage();
            });

            button.addEventListener('mouseenter', function() {
                button.style.backgroundColor = '#008bb3 !important';
            });

            button.addEventListener('mouseleave', function() {
                button.style.backgroundColor = '#00a1c7 !important';
            });

            if (insertionPoint) {
                targetContainer.insertBefore(button, insertionPoint);
            } else {
                targetContainer.appendChild(button);
            }

            setTimeout(() => {
                button.style.opacity = '1 !important';
                button.style.transform = 'translateX(0) !important';
            }, 50);
        }

        function createWelcomeButton() {
            if (document.querySelector('#welcome-button')) {
                return;
            }

            const recruitButton = document.querySelector('#recruit-button');
            const mobileContainer = document.querySelector('.mobile-button-container');

            if (!recruitButton) {
                return;
            }

            const button = document.createElement('button');
            button.id = 'welcome-button';
            button.textContent = 'Welcome';

            const isMobile = isMobileDevice();

            if (isMobile) {
                button.style.cssText = 'background-color: #28a745 !important; color: white !important; border: none !important; padding: 8px 16px !important; border-radius: 4px !important; cursor: pointer !important; font-size: 12px !important; font-weight: bold !important; margin: 0 !important; display: inline-block !important; transition: background-color 0.2s ease !important; touch-action: manipulation !important; flex: 0 0 auto !important;';
            } else {
                button.style.cssText = 'background-color: #28a745 !important; color: white !important; border: none !important; padding: 8px 16px !important; border-radius: 4px !important; cursor: pointer !important; font-size: 12px !important; font-weight: bold !important; margin-left: 5px !important; display: inline-block !important; vertical-align: middle !important; transition: background-color 0.2s ease !important;';
            }

            button.classList.add('button-animate-slide');
            button.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (e.target.form) {
                    e.target.form.onsubmit = function() { return false; };
                }
                await insertWelcomeMessage();
            });

            button.addEventListener('mouseenter', function() {
                button.style.backgroundColor = '#218838 !important';
            });

            button.addEventListener('mouseleave', function() {
                button.style.backgroundColor = '#28a745 !important';
            });

            if (isMobile && mobileContainer) {
                mobileContainer.appendChild(button);
            } else if (isMobile) {
                recruitButton.parentNode.insertBefore(button, recruitButton.nextSibling);
            } else {
                recruitButton.parentNode.insertBefore(button, recruitButton.nextSibling);
            }

            setTimeout(() => {
                button.style.opacity = '1 !important';
                button.style.transform = 'translateX(0) !important';
            }, 50);
        }

        function createWarButtonNewsletter() {
            if (document.querySelector('#war-button-newsletter')) {
                return;
            }

            const maxAttempts = 20;
            let attempts = 0;

            const checkForElements = setInterval(function() {
                attempts++;

                if (document.querySelector('#war-button-newsletter')) {
                    clearInterval(checkForElements);
                    return;
                }

                let targetElement = document.querySelector('#react-root-faction-newsletter div.desc');
                if (!targetElement) {
                    targetElement = document.querySelector('div.desc');
                }

                const titleField = document.querySelector('input.titleField___Rtn72');

                if (targetElement && titleField) {
                    clearInterval(checkForElements);

                    const button = document.createElement('button');
                    button.id = 'war-button-newsletter';
                    button.textContent = 'War';
                    button.style.cssText = 'background-color: #dc3545 !important; color: white !important; border: none !important; padding: 8px 16px !important; border-radius: 6px !important; cursor: pointer !important; font-size: 14px !important; font-weight: bold !important; margin: 15px 0 0 0 !important; display: inline-block !important; transition: background-color 0.2s ease !important;';
                    button.classList.add('button-animate-slide');
                    button.addEventListener('click', async function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        await insertWarMessageNewsletter();
                    });

                    button.addEventListener('mouseenter', function() {
                        button.style.backgroundColor = '#c82333 !important';
                    });

                    button.addEventListener('mouseleave', function() {
                        button.style.backgroundColor = '#dc3545 !important';
                    });

                    targetElement.appendChild(button);
                    setTimeout(() => {
                        button.style.opacity = '1 !important';
                        button.style.transform = 'translateX(0) !important';
                    }, 50);

                    setTimeout(function() {
                        createOtherButtonNewsletter();
                    }, 50);

                } else if (attempts >= maxAttempts) {
                    clearInterval(checkForElements);
                }
            }, 500);
        }

        function createOtherButtonNewsletter() {
            if (document.querySelector('#other-button-newsletter')) {
                return;
            }

            const maxAttempts = 20;
            let attempts = 0;

            const checkForWarButton = setInterval(function() {
                attempts++;

                if (document.querySelector('#other-button-newsletter')) {
                    clearInterval(checkForWarButton);
                    return;
                }

                const warButton = document.querySelector('#war-button-newsletter');

                if (warButton) {
                    clearInterval(checkForWarButton);

                    const button = document.createElement('button');
                    button.id = 'other-button-newsletter';
                    button.textContent = 'Other';
                    button.style.cssText = 'background-color: #28a745 !important; color: white !important; border: none !important; padding: 8px 16px !important; border-radius: 6px !important; cursor: pointer !important; font-size: 14px !important; font-weight: bold !important; margin: 0 0 0 15px !important; display: inline-block !important; transition: background-color 0.2s ease !important;';
                    button.classList.add('button-animate-scale');
                    button.addEventListener('click', async function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        await insertOtherMessageNewsletter();
                    });

                    button.addEventListener('mouseenter', function() {
                        button.style.backgroundColor = '#218838 !important';
                    });

                    button.addEventListener('mouseleave', function() {
                        button.style.backgroundColor = '#28a745 !important';
                    });

                    warButton.parentNode.insertBefore(button, warButton.nextSibling);
                    setTimeout(() => {
                        button.style.opacity = '1 !important';
                        button.style.transform = 'translateX(0) !important';
                    }, 50);

                } else if (attempts >= maxAttempts) {
                    clearInterval(checkForWarButton);
                }
            }, 50);
        }

        // Initialize
        function init() {
            const isComposePage = window.location.href.includes('messages.php') &&
                  (window.location.hash.includes('compose') ||
                   window.location.href.includes('compose') ||
                   window.location.href.includes('sendto='));

            if (isComposePage) {
                const waitForElements = () => {
                    const nameInput = document.querySelector('input[name="sendto"]') || document.querySelector('input[placeholder*="Name"]');
                    const formContainer = document.querySelector('div.form-title-input-text');

                    if (nameInput || formContainer) {
                        createRecruitButton();
                        setTimeout(function() {
                            createWelcomeButton();
                        }, 100);
                    } else {
                        setTimeout(waitForElements, 500);
                    }
                };

                waitForElements();
            }
            else if (window.location.href.includes('factions.php') &&
                     (window.location.hash.includes('tab=controls&option=newsletter') ||
                      window.location.href.includes('tab=controls&option=newsletter'))) {
                createWarButtonNewsletter();
            }
        }

        // Pre-load all HTML templates
        fetchRecruitmentHTML();
        fetchWelcomeHTML();
        fetchWarHTML();
        fetchOtherHTML();

        // Run on page load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                init();
            });
        } else {
            init();
        }

        // Handle hash changes (SPA navigation)
        window.addEventListener('hashchange', function() {
            if (window.location.hash.includes('compose')) {
                setTimeout(function() {
                    init();
                }, 1000);
            }
            else if (window.location.hash.includes('tab=controls&option=newsletter')) {
                const existingWarButton = document.querySelector('#war-button-newsletter');
                const existingOtherButton = document.querySelector('#other-button-newsletter');
                if (existingWarButton) existingWarButton.remove();
                if (existingOtherButton) existingOtherButton.remove();

                setTimeout(function() {
                    init();
                }, 1000);
            }
            else if (window.location.href.includes('factions.php') &&
                     !window.location.hash.includes('tab=controls&option=newsletter')) {
                const warButton = document.querySelector('#war-button-newsletter');
                const otherButton = document.querySelector('#other-button-newsletter');
                if (warButton) warButton.remove();
                if (otherButton) otherButton.remove();
            }
        });

        // Observe URL changes for SPA navigation
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                setTimeout(function() {
                    init();
                }, 1500);
            }
        }).observe(document, { subtree: true, childList: true });

        // Handle window resize
        let resizeTimeout;
        let lastWidth = window.innerWidth;

        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function() {
                const currentWidth = window.innerWidth;

                if (Math.abs(currentWidth - lastWidth) < 100) {
                    return;
                }

                lastWidth = currentWidth;

                const isComposePage = window.location.href.includes('messages.php') &&
                      (window.location.hash.includes('compose') ||
                       window.location.href.includes('compose') ||
                       window.location.href.includes('sendto='));

                if (isComposePage) {
                    const recruitButton = document.querySelector('#recruit-button');
                    const welcomeButton = document.querySelector('#welcome-button');

                    if (recruitButton || welcomeButton) {
                        if (recruitButton) recruitButton.remove();
                        if (welcomeButton) welcomeButton.remove();
                        const mobileContainer = document.querySelector('.mobile-button-container');
                        if (mobileContainer) mobileContainer.remove();

                        setTimeout(function() {
                            createRecruitButton();
                            setTimeout(function() {
                                createWelcomeButton();
                            }, 100);
                        }, 200);
                    }
                }
            }, 500);
        });
        
        console.log('[Comm Helper] Initialized successfully');
    }
};

// Export to window for DSS Manager
if (typeof window !== 'undefined') {
    window.CommHelperModule = CommHelperModule;
}
