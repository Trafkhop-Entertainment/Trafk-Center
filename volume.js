(function() {
    const getStoredVol = () => localStorage.getItem('site-volume') || "0.5";

    const applyStorageVolume = () => {
        const currentVol = parseFloat(getStoredVol());
        document.querySelectorAll('audio').forEach(audio => {
            audio.volume = currentVol;
        });

        const slider = document.getElementById('lautstärke');
        if (slider) {
            slider.value = getStoredVol();
        }
    };

    const originalPlay = Audio.prototype.play;
    Audio.prototype.play = function() {
        this.volume = parseFloat(getStoredVol());
        return originalPlay.apply(this, arguments);
    };

    applyStorageVolume();

    document.addEventListener('DOMContentLoaded', () => {
        applyStorageVolume();

        const slider = document.getElementById('lautstärke');
        if (slider) {
            slider.addEventListener('input', (e) => {
                localStorage.setItem('site-volume', e.target.value);
                applyStorageVolume();
            });
        }
    });

    window.addEventListener('load', applyStorageVolume);

})();
