(function() {
    const getStoredVol = () => parseFloat(localStorage.getItem('site-volume') ?? '0.5');

    // Sofort: alle Media-Elemente die schon existieren
    const applyVolume = (vol) => {
        document.querySelectorAll('audio, video').forEach(m => m.volume = vol);
        const slider = document.getElementById('volume');
        if (slider) slider.value = vol;
    };

        // Override: fängt jedes neue Media-Element ab, egal wann es abgespielt wird
        const originalPlay = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function() {
            this.volume = getStoredVol();
            return originalPlay.apply(this, arguments);
        };

        applyVolume(getStoredVol());

        document.addEventListener('DOMContentLoaded', () => {
            applyVolume(getStoredVol());

            const slider = document.getElementById('volume');
            if (slider) {
                slider.addEventListener('input', (e) => {
                    const vol = parseFloat(e.target.value);
                    localStorage.setItem('site-volume', vol);
                    applyVolume(vol);
                });
            }
        });

        window.addEventListener('load', () => applyVolume(getStoredVol()));
})();
