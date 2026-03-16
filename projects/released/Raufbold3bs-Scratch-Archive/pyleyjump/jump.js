    document.addEventListener('DOMContentLoaded', () => {
    const pyley = document.getElementById('pyleyalive');
    const trampImg = document.getElementById('tramp1');
    const jumpSound = document.getElementById('jumpsound');

    let jumpSoundEnabled = false;

    if (trampImg) {
        trampImg.addEventListener('click', (e) => {
            e.stopPropagation();
            jumpSoundEnabled = true;

            if (jumpSound) {
                jumpSound.currentTime = 0;
                jumpSound.play();
            }
        });
    }

    if (pyley) {
        pyley.addEventListener('animationiteration', () => {
            if (trampImg) trampImg.src = 'tramp2.png';

            if (jumpSound && jumpSoundEnabled) {
                jumpSound.currentTime = 0;
                jumpSound.play().catch(e => console.log("Audio-Blockade"));
            }

            const randomHeight = Math.floor(Math.random() * 250) + 250;
            pyley.style.setProperty('--jump-height', randomHeight + 'px');

            if (Math.random() < 0.3) {
                pyley.style.animation = 'jump 1.5s infinite ease-in-out, pyleyFlip 1.5s linear';
            } else {
                pyley.style.animation = 'jump 1.5s infinite ease-in-out';
            }

            setTimeout(() => {
                if (trampImg) trampImg.src = 'tramp1.png';
            }, 200);
        });
    }
});