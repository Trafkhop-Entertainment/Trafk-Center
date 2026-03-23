(function() {
    // Holt den gespeicherten Zustand (gibt 'true' oder 'false' als String zurück)
    const getStoredTheme = () => localStorage.getItem('light-mode') === 'true';

    document.addEventListener('DOMContentLoaded', () => {
        const checkbox = document.getElementById('darkmode');

        if (checkbox) {
            // Prüfen, ob schon ein Zustand gespeichert wurde
            if (localStorage.getItem('light-mode') !== null) {
                // Setzt das Häkchen (und damit das Theme), je nachdem was gespeichert war
                checkbox.checked = getStoredTheme();
            }

            // Sobald der User auf "Light Mode" klickt, speichern wir die neue Auswahl
            checkbox.addEventListener('change', (e) => {
                localStorage.setItem('light-mode', e.target.checked);
            });
        }
    });
})();
