document.addEventListener('DOMContentLoaded', () => {
    const volumeSlider = document.getElementById('lautstärke');

    // 1. Gespeicherte Lautstärke laden
    const savedVolume = localStorage.getItem('site-volume') || 0.5;

    // Regler auf den gespeicherten Wert setzen
    volumeSlider.value = savedVolume;

    function updateAllVolumes(volume) {
        const allAudios = document.querySelectorAll('audio');
        allAudios.forEach(audio => {
            audio.volume = volume;
        });
        localStorage.setItem('site-volume', volume);
    }

    // 2. Initial beim Laden auf alle vorhandenen <audio> Tags anwenden
    updateAllVolumes(savedVolume);

    volumeSlider.addEventListener('input', (e) => {
        updateAllVolumes(e.target.value);
    });

    // 3. DER WICHTIGSTE TEIL FÜR PYLEY JUMP:
    // Dieser Teil sorgt dafür, dass JEDER neue Sound (Trampolin, Bombe, etc.)
    // sofort die richtige Lautstärke hat, egal wann er erzeugt wird.
    const originalPlay = Audio.prototype.play;
    Audio.prototype.play = function() {
        // Wir nehmen den aktuellen Wert vom Slider, falls der User ihn gerade bewegt hat,
        // ansonsten den savedVolume Wert.
        this.volume = volumeSlider ? volumeSlider.value : (localStorage.getItem('site-volume') || 0.5);
        return originalPlay.apply(this, arguments);
    };
});