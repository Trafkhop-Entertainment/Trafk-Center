(function() {
    // Sofort vor dem Rendern anwenden – kein Flash mehr
    const isLight = localStorage.getItem('light-mode') === 'true';
    document.documentElement.classList.toggle('dark-mode', !isLight);

    document.addEventListener('DOMContentLoaded', () => {
        const checkbox = document.getElementById('darkmode');
        if (!checkbox) return;

        checkbox.checked = isLight;

        checkbox.addEventListener('change', (e) => {
            const light = e.target.checked;
            localStorage.setItem('light-mode', String(light));
            document.documentElement.classList.toggle('dark-mode', !light);
        });
    });
})();
