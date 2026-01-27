(function() {
    // 1. Wert laden (Zentral)
    const getStoredVol = () => localStorage.getItem('site-volume') || "0.5";

    // 2. Audio-Abfangen (Funktioniert immer)
    const originalPlay = Audio.prototype.play;
    Audio.prototype.play = function() {
        this.volume = parseFloat(getStoredVol());
        return originalPlay.apply(this, arguments);
    };

    // 3. Den Slider "jagen"
    const setupSlider = (slider) => {
        if (!slider || slider.dataset.initialized) return;

        // Wert sofort erzwingen
        slider.value = getStoredVol();
        slider.dataset.initialized = "true";

        // Bei Änderung speichern
        slider.oninput = (e) => {
            const val = e.target.value;
            localStorage.setItem('site-volume', val);
            // Alle aktiven Sounds auf der aktuellen Seite updaten
            document.querySelectorAll('audio').forEach(a => a.volume = parseFloat(val));
        };
    };

    // 4. MutationObserver: Beobachtet, ob der Slider zum DOM hinzugefügt wird
    const observer = new MutationObserver((mutations) => {
        const slider = document.getElementById('lautstärke');
        if (slider) {
            setupSlider(slider);
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // 5. Fallback für den Fall, dass er schon da ist
    window.addEventListener('load', () => {
        const slider = document.getElementById('lautstärke');
        if (slider) setupSlider(slider);
    });
})();
