(function() {
    const getStoredVol = () => localStorage.getItem('site-volume') || "0.5";

    // 1. Funktion zum Erzwingen der Lautstärke auf ALLE vorhandenen Audios
    const applyStorageVolume = () => {
        const currentVol = parseFloat(getStoredVol());
        document.querySelectorAll('audio').forEach(audio => {
            audio.volume = currentVol;
        });

        // Auch den Slider-Knopf optisch anpassen, falls er schon da ist
        const slider = document.getElementById('lautstärke');
        if (slider) {
            slider.value = getStoredVol();
        }
    };

    // 2. GLOBALER INTERCEPTOR: Für Sounds, die erst später erstellt werden
    const originalPlay = Audio.prototype.play;
    Audio.prototype.play = function() {
        this.volume = parseFloat(getStoredVol());
        return originalPlay.apply(this, arguments);
    };

    // 3. MEHRFACH-CHECK (Sorgt dafür, dass es beim Laden direkt passt)
    // Sofort ausführen
    applyStorageVolume();

    // Wenn das HTML fertig geladen ist
    document.addEventListener('DOMContentLoaded', () => {
        applyStorageVolume();

        const slider = document.getElementById('lautstärke');
        if (slider) {
            slider.addEventListener('input', (e) => {
                localStorage.setItem('site-volume', e.target.value);
                applyStorageVolume(); // Direkt alles updaten
            });
        }
    });

    // Sicherheit für langsame Browser: Nach 500ms nochmal drüberbügeln
    window.addEventListener('load', applyStorageVolume);

})();
