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
        console.log("Browser blockiert Autoplay. Klicke auf das Logo!");
    });
}

bgMusic.addEventListener('ended', () => {
    currentTrack++;
    playTrack(currentTrack);
});

document.addEventListener('DOMContentLoaded', () => {
    const logo = document.querySelector('#logoundnav img');

    if (logo) {
        logo.style.cursor = 'pointer';

        logo.addEventListener('click', () => {
            if (bgMusic.paused) {
                playTrack(currentTrack);
                console.log("Musik über Logo gestartet!");
            } else {
                bgMusic.pause();
                console.log("Musik gestoppt.");
            }
        });
    }
});

function toggleMusic() {
    if (bgMusic.paused) {
        bgMusic.play();
    } else {
        bgMusic.pause();
    }
}