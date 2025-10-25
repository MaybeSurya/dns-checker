// Wait for DOM to be ready
// Wait for both DOM and scripts to be ready
function initApp() {
    if (!window.React || !window.ReactDOM || !window.DNSChecker) {
        console.error('Required dependencies not loaded:', {
            React: !!window.React,
            ReactDOM: !!window.ReactDOM,
            DNSChecker: !!window.DNSChecker
        });
        setTimeout(initApp, 100);
        return;
    }

    const { createRoot } = ReactDOM;
    const rootElement = document.getElementById('root');
    if (rootElement && window.DNSChecker) {
        const root = createRoot(rootElement);
        root.render(React.createElement(window.DNSChecker));
    } else {
        console.error('Missing required elements:', {
            root: !!rootElement,
            DNSChecker: !!window.DNSChecker
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

