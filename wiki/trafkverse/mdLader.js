document.addEventListener("DOMContentLoaded", () => {
    const containers = document.querySelectorAll('[data-markdown]');

    containers.forEach(container => {
        const file = container.getAttribute('data-markdown');

        if (file) {
            fetch(file)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Datei "${file}" konnte nicht geladen werden.`);
                }
                return response.text();
            })
            .then(markdown => {
                // --- Obsidian-Syntax zu Standard-Markdown konvertieren ---
                let processedMarkdown = markdown.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, fileName, altText) => {
                    const alt = altText || fileName;
                    // WICHTIG: Leerzeichen in der URL kodieren, sonst erkennt marked.js das Bild nicht
                    const safeFileName = encodeURI(fileName.trim());
                    return `![${alt}](${safeFileName})`;
                });

                // Normale Wiki-Links [[Link]] ebenfalls unterstützen
                processedMarkdown = processedMarkdown.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, fileName, linkText) => {
                    const text = linkText || fileName;
                    const safeFileName = encodeURI(fileName.trim());
                    return `[${text}](${safeFileName})`;
                });

                const basePath = file.substring(0, file.lastIndexOf('/') + 1);
                const renderer = new marked.Renderer();

                // Pfade für Bilder anpassen
                renderer.image = function(href, title, text) {
                    if (!href.startsWith('http') && !href.startsWith('/')) {
                        href = basePath + href;
                    }
                    // decodeURI sorgt dafür, dass die Anzeige im HTML wieder sauber aussieht
                    return `<img src="${href}" alt="${text}" ${title ? `title="${title}"` : ''}>`;
                };

                // Pfade für Links anpassen
                renderer.link = function(href, title, text) {
                    if (!href.startsWith('http') && !href.startsWith('/')) {
                        href = basePath + href;
                    }
                    return `<a href="${href}" ${title ? `title="${title}"` : ''}>${text}</a>`;
                };

                container.innerHTML = marked.parse(processedMarkdown, { renderer });
            })
            .catch(error => {
                container.innerHTML = `<p style="color: red;">Fehler: ${error.message}</p>`;
                console.error('Markdown-Loader-Fehler:', error);
            });
        }
    });
});
