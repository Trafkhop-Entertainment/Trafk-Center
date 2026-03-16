    document.addEventListener('DOMContentLoaded', function() {
    const spawnContainer = document.getElementById('spawn-fenster');
    const main = document.querySelector('main');

    function getMainBounds() {
        const rect = main.getBoundingClientRect();
        return {
            top: rect.top + window.scrollY,
            bottom: rect.bottom + window.scrollY,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height
        };
    }

    function createFenster() {
        const bounds = getMainBounds();

        const fenster = document.createElement('img');
        fenster.src = 'fenster.png';
        fenster.className = 'fenster';
        fenster.alt = 'Fenster';

        const rotation = Math.random() * 360;

        const startSide = Math.floor(Math.random() * 4);
        let startX, startY;

        switch(startSide) {
            case 0:
                startX = bounds.left + Math.random() * bounds.width;
                startY = bounds.top - 100;
                break;
            case 1:
                startX = bounds.right + 100;
                startY = bounds.top + Math.random() * bounds.height;
                break;
            case 2:
                startX = bounds.left + Math.random() * bounds.width;
                startY = bounds.bottom + 100;
                break;
            case 3:
                startX = bounds.left - 100;
                startY = bounds.top + Math.random() * bounds.height;
                break;
        }

        fenster.style.left = startX + 'px';
        fenster.style.top = startY + 'px';
        fenster.style.transform = `rotate(${rotation}deg)`;

        spawnContainer.appendChild(fenster);

        fenster.style.animation = 'fadeInOut 30000ms ease-in-out';

        function moveToRandomPosition() {
            const newBounds = getMainBounds();
            const targetX = newBounds.left + Math.random() * newBounds.width;
            const targetY = newBounds.top + Math.random() * newBounds.height;
            const duration = 3000 + Math.random() * 3000;

            fenster.style.transition = `left ${duration}ms linear, top ${duration}ms linear`;
            fenster.style.left = targetX + 'px';
            fenster.style.top = targetY + 'px';

            return duration;
        }

        setTimeout(() => {
            let currentTime = 0;
            const totalDuration = 60000;

            function nextMove() {
                const moveDuration = moveToRandomPosition();
                currentTime += moveDuration;

                if (currentTime < totalDuration) {
                    setTimeout(nextMove, moveDuration);
                } else {
                    setTimeout(() => {
                        fenster.remove();
                    }, totalDuration - currentTime + moveDuration);
                }
            }

            nextMove();
        }, 50);
    }

    function startSpawning() {
        const initialCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < initialCount; i++) {
            setTimeout(() => createFenster(), i * 1000);
        }

        setInterval(() => {
            if (Math.random() < 0.15) {
                createFenster();
            }
        }, 2000);
    }

    setTimeout(startSpawning, 500);
});