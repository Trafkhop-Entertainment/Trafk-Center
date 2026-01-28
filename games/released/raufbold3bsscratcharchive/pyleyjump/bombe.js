document.addEventListener('DOMContentLoaded', () => {
    const bombe = document.getElementById('bombe');
    const fallSound = document.getElementById('fallsound');
    const boomSound = document.getElementById('boomsound');
    const gameoverSound = document.getElementById('gameoversound');
    const overlay = document.getElementById('gameover-overlay');

    const bgMusic = document.getElementById('hintergrundmusik');
    const jumpSound = document.getElementById('jumpsound');


    setTimeout(startBombEvent, 500000);

    function startBombEvent() {
        bombe.style.display = 'block';
        if(fallSound) fallSound.play();

        const duration = 3000;
        const startPos = -100;
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
                setTimeout(() => {
                    prepareExplosion();
                }, 100);
            }
        }
        requestAnimationFrame(animateFall);
    }

    function prepareExplosion() {
        const bgMusic = document.getElementById('hintergrundmusik');
        const jumpSound = document.getElementById('jumpsound');
        const fallSound = document.getElementById('fallsound');

        if (bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; }
        if (jumpSound) { jumpSound.pause(); jumpSound.currentTime = 0; }
        if (fallSound) fallSound.pause();

        const pyley = document.getElementById('pyleyalive');
        const tramp = document.getElementById('tramppyley');

        if (pyley) {
            pyley.style.animation = 'none';
            pyley.classList.remove('flipping');

            pyley.style.transform = 'translate(1500px, -1500px) rotate(720deg) scale(0)';
            pyley.style.opacity = '0';
        }

        if (tramp) tramp.style.display = 'none';

        bombe.style.top = '50%';
        bombe.style.left = '50%';
        bombe.style.transform = 'translate(-50%, -50%)';
        bombe.style.position = 'fixed';

        triggerExplosion();
    }

    function triggerExplosion() {
        if(boomSound) boomSound.play();
        bombe.style.maxWidth = 'none';
        bombe.style.height = 'auto';

        const boomImages = [
            'pyleyjump/boom0.svg',
            'pyleyjump/boom1.svg',
            'pyleyjump/boom2.svg',
            'pyleyjump/boom3.svg'
        ];

        let stage = 0;
        const totalExplosionTime = 5000;
        const frameTime = totalExplosionTime / boomImages.length;

        const interval = setInterval(() => {
            if (stage < boomImages.length) {
                bombe.src = boomImages[stage];

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

        setTimeout(() => {
            location.reload();
        }, 15000);
    }
});