(function() {
    // Holt die gespeicherte Lautstärke oder setzt 0.5 als Standard
    const getStoredVol = () => localStorage.getItem('site-volume') || "0.5";

    const applyStorageVolume = () => {
        const currentVol = parseFloat(getStoredVol());

        // FIX: Sucht jetzt nach Audio- UND Video-Elementen
        document.querySelectorAll('audio, video').forEach(media => {
            media.volume = currentVol;
        });

        const slider = document.getElementById('volume');
        if (slider && slider.value !== currentVol.toString()) {
            slider.value = currentVol;
        }
    };

    // FIX: Überschreibt das generelle MediaElement, um sowohl neue Audio- als auch Video-Aufrufe abzufangen
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
        this.volume = parseFloat(getStoredVol());
        return originalPlay.apply(this, arguments);
    };

    // Initiale Anwendung (für Elemente, die schon früh geladen sind)
    applyStorageVolume();

    // Event Listener für den DOMContentLoaded (wenn das HTML fertig geladen ist)
    document.addEventListener('DOMContentLoaded', () => {
        applyStorageVolume();

        const slider = document.getElementById('volume');
        if (slider) {
            slider.addEventListener('input', (e) => {
                localStorage.setItem('site-volume', e.target.value);
                applyStorageVolume();
            });
        }
    });

    // Fallback, wenn alle Ressourcen (wie externe Skripte) geladen wurden
    window.addEventListener('load', applyStorageVolume);

})();
