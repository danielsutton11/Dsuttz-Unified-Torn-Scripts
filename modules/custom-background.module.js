// Custom Background Module for DSS Manager
// Version: 0.2
// This module can be loaded by the DSS Manager from GitHub

const CustomBackgroundModule = {
    id: 'custom-background',
    name: 'Custom Background',
    version: '0.2',
    
    // Module initialization function
    init(settings = {}) {
        console.log('[Custom Background] Initializing...');
        
        // Get stored image URL from settings or prompt for it
        let imageUrl = settings.backgroundUrl || GM_getValue('custom_bg_image_url');
        
        // Validate and prompt for image URL if needed
        if (!imageUrl || imageUrl === 'undefined' || imageUrl === '') {
            let text = 'Torn Custom Background:\n\nPlease enter your background image URL.\n\n' +
                      'Use Catbox.moe or Imgur for best quality.\n\n' +
                      'Example: https://i.imgur.com/yourimage.jpeg\n\n' +
                      'To update the image later, go to DSS Settings and change the Background URL.';
            imageUrl = prompt(text, "");
            if (imageUrl) {
                GM_setValue('custom_bg_image_url', imageUrl);
            } else {
                console.log('[Custom Background] No URL provided, exiting');
                return; // Exit if no URL provided
            }
        }
        
        // Inject CSS immediately
        const style = document.createElement('style');
        style.id = 'dss-custom-background-style';
        style.textContent = `
            body {
                background-image: url('${imageUrl}') !important;
                background-size: cover !important;
                background-position: center center !important;
                background-repeat: no-repeat !important;
                background-attachment: fixed !important;
            }
            /* Make sure the backdrop container doesn't block our background */
            .d .backdrops-container {
                background: transparent !important;
            }
            .d .backdrops-container .custom-bg-desktop,
            .d .backdrops-container .custom-bg-mobile {
                background: transparent !important;
            }
            /* Add blur overlay using backdrop container */
            .d .backdrops-container::after {
                content: '' !important;
                position: fixed !important;
                top: 0 !important;
                left: 50% !important;
                transform: translateX(-50%) scaleX(var(--zoom-scale, 1)) !important;
                transform-origin: center top !important;
                width: 44% !important;
                height: 100vh !important;
                background: rgba(0.5, 0, 0, 0.5) !important;
                backdrop-filter: blur(8px) !important;
                -webkit-backdrop-filter: blur(8px) !important;
                pointer-events: none !important;
                z-index: 1 !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
        
        // Use a fixed baseline - 90% zoom at 2048px width
        const baselineWidth = 2048;
        const baselineZoom = 0.9;
        const referenceWidth = baselineWidth / baselineZoom;
        let lastWidth = null;
        
        // Update zoom scale on zoom change
        function updateZoomScale() {
            const currentWidth = window.innerWidth;
            if (currentWidth !== lastWidth) {
                const zoomLevel = referenceWidth / currentWidth;
                document.body.style.setProperty('--zoom-scale', zoomLevel);
                lastWidth = currentWidth;
            }
        }
        
        // Only check on resize events, not continuously
        window.addEventListener('resize', updateZoomScale);
        
        // Initial call
        updateZoomScale();
        
        console.log('[Custom Background] Initialized successfully with URL:', imageUrl);
    }
};

// Export to window for DSS Manager
if (typeof window !== 'undefined') {
    window.CustomBackgroundModule = CustomBackgroundModule;
}
