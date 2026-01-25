const pyley = document.getElementById('pyleyalive');
const trampImg = document.getElementById('tramp1');
const jumpSound = document.getElementById('jumpsound');

pyley.addEventListener('animationiteration', () => {
    // 1. Trampolin-Effekt & Sound (bleibt gleich)
    trampImg.src = 'pyleyjump/tramp2.png';
    jumpSound.currentTime = 0;
    jumpSound.play();

    // 2. ZUFÄLLIGE HÖHE BERECHNEN
    // Wir würfeln einen Wert zwischen 250px und 400px
    const randomHeight = Math.floor(Math.random() * 250) + 250;
    pyley.style.setProperty('--jump-height', randomHeight + 'px');

    // 3. Salto-Logik (wie gehabt)
    if (Math.random() < 0.3) {
        pyley.style.animation = 'jump 1.5s infinite ease-in-out, pyleyFlip 1.5s linear';
    } else {
        pyley.style.animation = 'jump 1.5s infinite ease-in-out';
    }

    setTimeout(() => {
        trampImg.src = 'pyleyjump/tramp1.png';
    }, 200);
});