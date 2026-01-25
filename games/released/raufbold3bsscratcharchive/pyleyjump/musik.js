// musik.js
const bgMusic = document.getElementById('hintergrundmusik');

const playlist = [
    'pyleyjump/menu.mp3',
    'pyleyjump/menu.mp3',
    'pyleyjump/menu.mp3',
    'pyleyjump/menu.mp3',
    'pyleyjump/1-1.mp3',
    'pyleyjump/1-2.mp3',
    'pyleyjump/1-3.mp3',
    'pyleyjump/2.mp3',
    'pyleyjump/3.mp3',
    'pyleyjump/4.mp3'
];

let currentTrack = 0;

function playTrack(index) {
    if (index >= playlist.length) index = 0;
    currentTrack = index;
    bgMusic.src = playlist[currentTrack];
    bgMusic.play().catch(error => {
        console.log("Warte auf Nutzerinteraktion für Musik...");
    });
}

// Nächster Track wenn einer endet
bgMusic.addEventListener('ended', () => {
    currentTrack++;
    playTrack(currentTrack);
});

// Start-Trigger: Musik startet beim ersten Klick auf die Seite
document.addEventListener('click', () => {
    if (bgMusic.paused && !bgMusic.src.includes(playlist[currentTrack])) {
        playTrack(currentTrack);
    }
}, { once: true }); // Führt das nur einmal aus

// Funktion zum Stoppen/Starten (kannst du von anderen Skripten aufrufen)
function toggleMusic() {
    if (bgMusic.paused) bgMusic.play();
    else bgMusic.pause();
}