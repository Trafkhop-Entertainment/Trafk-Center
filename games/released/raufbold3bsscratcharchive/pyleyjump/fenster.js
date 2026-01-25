// Warte bis die Seite geladen ist
document.addEventListener('DOMContentLoaded', function() {
    const spawnContainer = document.getElementById('spawn-fenster');
    const main = document.querySelector('main');

    // Funktion um die Grenzen der Main-Section zu bekommen
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

    // Funktion um ein neues Fenster zu erstellen
    function createFenster() {
        const bounds = getMainBounds();

        // Erstelle ein neues Fenster-Element
        const fenster = document.createElement('img');
        fenster.src = 'pyleyjump/fenster.png';
        fenster.className = 'fenster';
        fenster.alt = 'Fenster';

        // Zufällige Rotation (0-360 Grad)
        const rotation = Math.random() * 360;

        // Zufällige Startposition an einer Seite der Main-Section
        const startSide = Math.floor(Math.random() * 4);
        let startX, startY;

        switch(startSide) {
            case 0: // oben
                startX = bounds.left + Math.random() * bounds.width;
                startY = bounds.top - 100;
                break;
            case 1: // rechts
                startX = bounds.right + 100;
                startY = bounds.top + Math.random() * bounds.height;
                break;
            case 2: // unten
                startX = bounds.left + Math.random() * bounds.width;
                startY = bounds.bottom + 100;
                break;
            case 3: // links
                startX = bounds.left - 100;
                startY = bounds.top + Math.random() * bounds.height;
                break;
        }

        // Setze Startposition
        fenster.style.left = startX + 'px';
        fenster.style.top = startY + 'px';
        fenster.style.transform = `rotate(${rotation}deg)`;

        // Füge das Fenster zum Container hinzu
        spawnContainer.appendChild(fenster);

        // Fade-In Animation
        fenster.style.animation = 'fadeInOut 30000ms ease-in-out';

        // Funktion für Richtungswechsel
        function moveToRandomPosition() {
            const newBounds = getMainBounds();
            const targetX = newBounds.left + Math.random() * newBounds.width;
            const targetY = newBounds.top + Math.random() * newBounds.height;
            const duration = 3000 + Math.random() * 3000; // 3-6 Sekunden pro Bewegung

            fenster.style.transition = `left ${duration}ms linear, top ${duration}ms linear`;
            fenster.style.left = targetX + 'px';
            fenster.style.top = targetY + 'px';

            return duration;
        }

        // Starte die erste Bewegung
        setTimeout(() => {
            let currentTime = 0;
            const totalDuration = 60000; // 60? Sekunden gesamt

            function nextMove() {
                const moveDuration = moveToRandomPosition();
                currentTime += moveDuration;

                if (currentTime < totalDuration) {
                    setTimeout(nextMove, moveDuration);
                } else {
                    // Entferne das Fenster nach der Gesamtdauer
                    setTimeout(() => {
                        fenster.remove();
                    }, totalDuration - currentTime + moveDuration);
                }
            }

            nextMove();
        }, 50);
    }

    // Starte die Fenster-Spawning
    function startSpawning() {
        // Erstelle initial 2-3 Fenster
        const initialCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < initialCount; i++) {
            setTimeout(() => createFenster(), i * 1000);
        }

        // Spawn kontinuierlich neue Fenster (weniger häufig)
        setInterval(() => {
            // 15% Chance alle 2 Sekunden ein neues Fenster zu spawnen
            if (Math.random() < 0.15) {
                createFenster();
            }
        }, 2000);
    }

    // Starte nach kurzer Verzögerung
    setTimeout(startSpawning, 500);
});