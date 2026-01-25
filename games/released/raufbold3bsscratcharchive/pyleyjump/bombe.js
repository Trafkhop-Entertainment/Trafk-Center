document.addEventListener('DOMContentLoaded', () => {
    const bombe = document.getElementById('bombe');
    const fallSound = document.getElementById('fallsound');
    const boomSound = document.getElementById('boomsound');
    const gameoverSound = document.getElementById('gameoversound');
    const overlay = document.getElementById('gameover-overlay');

    // Referenzen zu den anderen Sounds zum Stoppen
    const bgMusic = document.getElementById('hintergrundmusik');
    const jumpSound = document.getElementById('jumpsound');

    // 5 Minuten Timer
    setTimeout(startBombEvent, 300000);

    function startBombEvent() {
        bombe.style.display = 'block';
        if(fallSound) fallSound.play();

        const duration = 3000;
        const startPos = -100;
        // Ziel: Footer (wir messen, wo der Footer anfängt)
        const footerRect = document.querySelector('footer').getBoundingClientRect();
        const endPos = footerRect.top + window.scrollY - 50;

        let startTime = null;

        function animateFall(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const currentPos = startPos + (endPos - startPos) * (progress / duration);

            bombe.style.top = currentPos + 'px';

            if (progress < duration) {
                requestAnimationFrame(animateFall);
            } else {
                // 1. BEI FOOTER ANKOMMEN: Kurz warten und dann in die Mitte
                setTimeout(() => {
                    prepareExplosion();
                }, 100);
            }
        }
        requestAnimationFrame(animateFall);
    }

    function prepareExplosion() {
        // 1. ALLE SOUNDS STOPPEN
        const bgMusic = document.getElementById('hintergrundmusik');
        const jumpSound = document.getElementById('jumpsound');
        const fallSound = document.getElementById('fallsound');

        if (bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; }
        if (jumpSound) { jumpSound.pause(); jumpSound.currentTime = 0; }
        if (fallSound) fallSound.pause();

        // 2. PYLEY WEGSCHIESSEN & ANIMATIONEN STOPPEN
        const pyley = document.getElementById('pyleyalive');
        const tramp = document.getElementById('tramppyley');

        if (pyley) {
            // Stoppt die normale Sprung-Animation
            pyley.style.animation = 'none';
            pyley.classList.remove('flipping');

            // Der "Kick Away" Effekt: Pyley schießt nach rechts oben und dreht sich wild
            pyley.style.transform = 'translate(1500px, -1500px) rotate(720deg) scale(0)';
            pyley.style.opacity = '0';
        }

        // Trampolin sofort ausblenden
        if (tramp) tramp.style.display = 'none';

        // 3. BOMBE IN DIE MITTE HOLEN
        bombe.style.top = '50%';
        bombe.style.left = '50%';
        bombe.style.transform = 'translate(-50%, -50%)';
        bombe.style.position = 'fixed';

        triggerExplosion();
    }

    function triggerExplosion() {
        if(boomSound) boomSound.play();

        const boomImages = [
            'pyleyjump/boom0.svg',
            'pyleyjump/boom1.svg',
            'pyleyjump/boom2.svg',
            'pyleyjump/boom3.svg'
        ];

        let stage = 0;
        const totalExplosionTime = 5000; // 5 Sekunden
        const frameTime = totalExplosionTime / boomImages.length;

        const interval = setInterval(() => {
            if (stage < boomImages.length) {
                bombe.src = boomImages[stage];

                // Kontinuierliche Größenveränderung (Wachstum)
                // Startet bei 50px (Bombe) und geht bis 1800px
                let currentSize = 50 + (stage + 1) * 450;
                bombe.style.width = currentSize + "px";

                stage++;
            } else {
                clearInterval(interval);
                showGameOver();
            }
        }, frameTime);
    }

    function showGameOver() {
        bombe.style.display = 'none';
        overlay.style.display = 'flex';

        if(gameoverSound) gameoverSound.play();

        // 5s GameOver + 10s Delay = 15s Refresh
        setTimeout(() => {
            location.reload();
        }, 15000);
    }
});