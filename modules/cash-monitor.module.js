// ==UserScript==
// @name         DSS: Torn Cash Monitor Module
// @namespace    Dsuttz Scripts
// @version      1.2
// @description  Monitor cash on hand with visual alerts and quick banking/trading options
// @author       Dsuttz
// ==/UserScript==

(function() {
    'use strict';

    const CashMonitorModule = {
        init: function(settings) {
            // Configuration
            const CASH_THRESHOLD = settings.cashThreshold || 1000000; // $1M default
            const CHECK_INTERVAL = 1000; // Check every 2 seconds
            const ALERT_COOLDOWN = 5000; // Don't show alert again for 10 seconds

            // State variables
            let checkTimer = null;
            let alertDialogOpen = false;
            let lastCashAmount = 0;

            function getCashOnHand() {
                const moneyElement = document.getElementById('user-money');
                if (!moneyElement) return null;

                const cashString = moneyElement.getAttribute('data-money');
                if (!cashString) return null;

                const cash = parseInt(cashString, 10);
                return isNaN(cash) ? null : cash;
            }

            function formatCash(amount) {
                if (amount >= 1000000000) {
                    return '$' + (amount / 1000000000).toFixed(2) + 'b';
                } else if (amount >= 1000000) {
                    return '$' + (amount / 1000000).toFixed(2) + 'm';
                } else if (amount >= 1000) {
                    return '$' + (amount / 1000).toFixed(2) + 'k';
                }
                return '$' + amount.toLocaleString();
            }

            function updateCheck() {
                const currentCash = getCashOnHand();
                if (currentCash === null) return;

                const now = Date.now();
                const storedAlertTime = sessionStorage.getItem('lastCashAlertTime');
                const lastAlert = storedAlertTime ? parseInt(storedAlertTime, 10) : 0;
                const timeSinceLastAlert = now - lastAlert;

                if (currentCash >= CASH_THRESHOLD &&
                    !alertDialogOpen &&
                    timeSinceLastAlert >= ALERT_COOLDOWN) {
                    showCashAlert(currentCash);
                    sessionStorage.setItem('lastCashAlertTime', now.toString());
                }

                lastCashAmount = currentCash;
            }

            function showCashAlert(cashAmount) {
                if (alertDialogOpen && document.getElementById('cash-alert-dialog')) return;

                alertDialogOpen = true;
                const formattedCash = formatCash(cashAmount);

                const dialog = document.createElement('div');
                dialog.id = 'cash-alert-dialog';
                dialog.innerHTML = `
                    <div class="dialog-content">
                        <button class="dialog-close">×</button>
                        <h3>💰 Cash Alert!</h3>
                        <p>You have over ${formatCash(CASH_THRESHOLD)} on hand</p>
                        <p class="cash-amount">${formattedCash}</p>
                        <div class="dialog-buttons">
                            <button class="btn-vault">Vault</button>
                            <button class="btn-faction-vault">Faction Vault</button>
                            <button class="btn-trade">Trade</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(dialog);

                dialog.querySelector('.btn-vault').addEventListener('click', handleVaultClick);
                dialog.querySelector('.btn-faction-vault').addEventListener('click', handleFactionVaultClick);
                dialog.querySelector('.btn-trade').addEventListener('click', handleTradeClick);
                dialog.querySelector('.dialog-close').addEventListener('click', closeCashAlert);
            }

            function handleVaultClick() {
                const onVaultPage = window.location.href.includes('properties.php') &&
                                    window.location.hash.includes('vault');

                sessionStorage.setItem('lastCashAlertTime', Date.now().toString());

                if (!onVaultPage) {
                    sessionStorage.setItem('highlightVaultControls', 'true');
                    closeCashAlert();
                    window.location.href = 'https://www.torn.com/properties.php#/p=options&tab=vault';
                    return;
                }

                closeCashAlert();
                setTimeout(() => highlightDepositControls(), 200);
            }

            function handleFactionVaultClick() {
                const onFactionVaultPage = window.location.href.includes('factions.php?step=your') &&
                                            window.location.hash.includes('armoury');

                sessionStorage.setItem('lastCashAlertTime', Date.now().toString());

                if (!onFactionVaultPage) {
                    sessionStorage.setItem('highlightFactionVaultControls', 'true');
                    closeCashAlert();
                    window.location.href = 'https://www.torn.com/factions.php?step=your&type=1#/tab=armoury';
                    return;
                }

                closeCashAlert();
                setTimeout(() => highlightFactionDepositControls(), 200);
            }

            function highlightDepositControls() {
                const depositInput = document.querySelector('input[name="deposit"][data-deposit].input-money');

                if (depositInput) {
                    let parent = depositInput.parentElement;
                    let maxButton = null;

                    for (let i = 0; i < 5 && parent; i++) {
                        maxButton = parent.querySelector('input.wai-btn[aria-label*="maximum amount"]');
                        if (maxButton) break;
                        parent = parent.parentElement;
                    }

                    if (maxButton) {
                        maxButton.click();
                        depositInput.dispatchEvent(new Event('input', { bubbles: true }));
                        depositInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }

                const depositButton = document.querySelector('input[type="submit"][value="DEPOSIT"]');
                if (depositButton) {
                    depositButton.classList.add('deposit-btn-highlight');

                    const removeHighlight = () => {
                        depositButton.classList.remove('deposit-btn-highlight');
                        depositButton.removeEventListener('click', removeHighlight);
                    };

                    setTimeout(removeHighlight, 10000);
                    depositButton.addEventListener('click', removeHighlight);
                }
            }

            function highlightFactionDepositControls() {
                let waiButton = document.querySelector('span.input-money-symbol input.wai-btn[aria-label*="maximum amount"]');

                if (!waiButton) {
                    waiButton = document.querySelector('input.wai-btn[aria-label*="maximum amount"]');
                }

                if (!waiButton) {
                    const vaultSection = document.querySelector('[class*="vault"], [class*="armoury"]');
                    if (vaultSection) {
                        waiButton = vaultSection.querySelector('input.wai-btn');
                    }
                }

                if (waiButton) {
                    waiButton.click();
                    waiButton.dispatchEvent(new Event('mousedown', { bubbles: true }));
                    waiButton.dispatchEvent(new Event('mouseup', { bubbles: true }));
                }

                let depositButton = document.querySelector('button.torn-btn[i-data*="i_410"]');

                if (!depositButton) {
                    const buttons = document.querySelectorAll('button.torn-btn');
                    for (let btn of buttons) {
                        if (btn.textContent.includes('DEPOSIT MONEY')) {
                            depositButton = btn;
                            break;
                        }
                    }
                }

                if (depositButton) {
                    depositButton.classList.add('deposit-btn-highlight');

                    const removeHighlight = () => {
                        depositButton.classList.remove('deposit-btn-highlight');
                        depositButton.removeEventListener('click', removeHighlight);
                    };

                    setTimeout(removeHighlight, 10000);
                    depositButton.addEventListener('click', removeHighlight);
                }
            }

            function handleTradeClick() {
                sessionStorage.setItem('lastCashAlertTime', Date.now().toString());
                closeCashAlert();
                window.location.href = 'https://www.torn.com/trade.php';
            }

            function closeCashAlert() {
                const dialog = document.getElementById('cash-alert-dialog');
                if (dialog) dialog.remove();
                alertDialogOpen = false;
                sessionStorage.setItem('lastCashAlertTime', Date.now().toString());
            }

            function checkVaultHighlight() {
                if (window.location.href.includes('properties.php') && window.location.hash.includes('vault')) {
                    if (sessionStorage.getItem('highlightVaultControls') === 'true') {
                        sessionStorage.removeItem('highlightVaultControls');

                        const waitForElements = setInterval(() => {
                            const depositInput = document.querySelector('input[name="deposit"][data-deposit].input-money');
                            const depositButton = document.querySelector('input[type="submit"][value="DEPOSIT"]');

                            if (depositInput && depositButton) {
                                clearInterval(waitForElements);
                                setTimeout(() => highlightDepositControls(), 200);
                            }
                        }, 50);

                        setTimeout(() => clearInterval(waitForElements), 10000);
                    }
                }

                if (window.location.href.includes('factions.php')) {
                    if (sessionStorage.getItem('highlightFactionVaultControls') === 'true') {
                        sessionStorage.removeItem('highlightFactionVaultControls');

                        let attemptCount = 0;
                        const maxAttempts = 200;

                        const waitForElements = setInterval(() => {
                            attemptCount++;

                            const waiButton = document.querySelector('input.wai-btn[aria-label*="maximum amount"]');
                            const depositButton = document.querySelector('button.torn-btn');

                            if (waiButton && depositButton) {
                                clearInterval(waitForElements);
                                setTimeout(() => highlightFactionDepositControls(), 300);
                            } else if (attemptCount >= maxAttempts) {
                                clearInterval(waitForElements);
                            }
                        }, 100);
                    }
                }
            }

            function addStyles() {
                GM_addStyle(`
                    #cash-alert-dialog {
                        position: fixed;
                        top: 20px;
                        left: 20px;
                        z-index: 999999;
                    }

                    #cash-alert-dialog .dialog-content {
                        background: linear-gradient(135deg, #064e3b 0%, #022c22 100%);
                        border: 2px solid rgb(34, 197, 94);
                        border-radius: 12px;
                        padding: 25px;
                        width: 380px;
                        box-shadow: 0 20px 60px rgba(34, 197, 94, 0.4),
                                    0 0 100px rgba(34, 197, 94, 0.2),
                                    0 10px 40px rgba(0, 0, 0, 0.5);
                        position: relative;
                        animation: dialog-slide-down 0.4s ease-out;
                    }

                    @keyframes dialog-slide-down {
                        from {
                            transform: translateY(-400px);
                            opacity: 0;
                        }
                        to {
                            transform: translateY(0);
                            opacity: 1;
                        }
                    }

                    #cash-alert-dialog .dialog-close {
                        position: absolute;
                        top: 8px;
                        right: 8px;
                        background: rgba(34, 197, 94, 0.2);
                        border: 1px solid rgba(34, 197, 94, 0.4);
                        color: rgb(34, 197, 94);
                        width: 28px;
                        height: 28px;
                        border-radius: 50%;
                        font-size: 20px;
                        line-height: 1;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        padding: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    #cash-alert-dialog .dialog-close:hover {
                        background: rgba(34, 197, 94, 0.4);
                        transform: rotate(90deg);
                    }

                    #cash-alert-dialog h3 {
                        margin: 0 0 12px 0;
                        color: rgb(34, 197, 94);
                        font-size: 20px;
                        font-weight: 600;
                        text-align: center;
                        padding-right: 20px;
                    }

                    #cash-alert-dialog p {
                        margin: 8px 0;
                        color: #d1fae5;
                        font-size: 15px;
                        text-align: center;
                    }

                    #cash-alert-dialog .cash-amount {
                        font-size: 24px;
                        font-weight: bold;
                        color: #6ee7b7;
                        font-family: 'Courier New', monospace;
                        margin: 12px 0 16px 0;
                    }

                    #cash-alert-dialog .dialog-buttons {
                        display: flex;
                        gap: 8px;
                        margin-top: 20px;
                    }

                    #cash-alert-dialog .btn-vault,
                    #cash-alert-dialog .btn-faction-vault,
                    #cash-alert-dialog .btn-trade {
                        flex: 1;
                        padding: 10px 8px;
                        border: none;
                        border-radius: 8px;
                        font-size: 13px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        text-decoration: none;
                        text-align: center;
                        display: inline-block;
                        white-space: nowrap;
                    }

                    #cash-alert-dialog .btn-vault {
                        background: linear-gradient(135deg, rgb(34, 197, 94) 0%, rgb(21, 128, 61) 100%);
                        color: white;
                    }

                    #cash-alert-dialog .btn-vault:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 20px rgba(34, 197, 94, 0.4);
                    }

                    #cash-alert-dialog .btn-faction-vault {
                        background: linear-gradient(135deg, #059669 0%, #047857 100%);
                        color: white;
                    }

                    #cash-alert-dialog .btn-faction-vault:hover {
                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        transform: translateY(-2px);
                    }

                    #cash-alert-dialog .btn-trade {
                        background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
                        color: white;
                    }

                    #cash-alert-dialog .btn-trade:hover {
                        background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
                        transform: translateY(-2px);
                    }

                    .deposit-btn-highlight {
                        animation: deposit-btn-glow 1.5s ease-in-out infinite !important;
                        border: 2px solid rgb(34, 197, 94) !important;
                    }

                    @keyframes deposit-btn-glow {
                        0%, 100% {
                            box-shadow: 0 0 5px rgba(34, 197, 94, 0.5),
                                        0 0 10px rgba(34, 197, 94, 0.4),
                                        0 0 15px rgba(34, 197, 94, 0.3),
                                        inset 0 0 10px rgba(34, 197, 94, 0.2);
                        }
                        50% {
                            box-shadow: 0 0 10px rgba(34, 197, 94, 0.8),
                                        0 0 20px rgba(34, 197, 94, 0.6),
                                        0 0 30px rgba(34, 197, 94, 0.4),
                                        inset 0 0 15px rgba(34, 197, 94, 0.3);
                        }
                    }
                `);
            }

            // Initialize
            addStyles();
            checkVaultHighlight();
            updateCheck();
            checkTimer = setInterval(updateCheck, CHECK_INTERVAL);

            window.addEventListener('beforeunload', () => {
                if (checkTimer) clearInterval(checkTimer);
            });
        }
    };

    if (typeof window !== 'undefined') {
        window.CashMonitorModule = CashMonitorModule;
    }

})();