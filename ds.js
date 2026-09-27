// Вставьте в Console (F12) при запущенном Lampa
(function() {
    // Простой монитор времени
    const startTime = Date.now();
    
    const panel = document.createElement('div');
    panel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 99999;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
    `;
    
    document.body.appendChild(panel);
    
    setInterval(() => {
        const elapsed = Date.now() - startTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        panel.textContent = `${hours}:${minutes}:${seconds}`;
    }, 1000);
})();
