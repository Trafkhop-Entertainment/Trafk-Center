document.addEventListener('DOMContentLoaded', () => {
    const volumeSlider = document.getElementById('lautstärke');

    // 1. Gespeicherte Lautstärke laden oder Standard (0.5) setzen
    const savedVolume = localStorage.getItem('site-volume') || 0.5;
    volumeSlider.value = savedVolume;

    // Funktion, um alle Audio-Elemente auf der Seite zu finden und anzupassen
    function updateAllVolumes(volume) {
        const allAudios = document.querySelectorAll('audio');
        allAudios.forEach(audio => {
            audio.volume = volume;
        });
        // Speichern für die nächste Seite
        localStorage.setItem('site-volume', volume);
    }

    // Initial anwenden
    updateAllVolumes(savedVolume);

    // Event-Listener für den Slider
    volumeSlider.addEventListener('input', (e) => {
        updateAllVolumes(e.target.value);
    });

    // TRICK FÜR DYNAMISCHE SOUNDS (wie dein Trampolin):
    // Wir beobachten, ob neue Sounds abgespielt werden
    const originalPlay = Audio.prototype.play;
    Audio.prototype.play = function() {
        this.volume = volumeSlider.value;
        return originalPlay.apply(this, arguments);
    };
});
