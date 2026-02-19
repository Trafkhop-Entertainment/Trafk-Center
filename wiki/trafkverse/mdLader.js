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
                // 1. Obsidian-Syntax in Standard-Markdown umwandeln
                // WICHTIG: Die URL wird mit encodeURI() behandelt, damit Leerzeichen zu %20 werden
                let processedMarkdown = markdown.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, fileName, altText) => {
                    const alt = altText || fileName;
                    const encodedFile = encodeURI(fileName.trim());
                    return `![${alt}](${encodedFile})`;
                });

                // Auch für normale Links [[...]]
                processedMarkdown = processedMarkdown.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, fileName, linkText) => {
                    const text = linkText || fileName;
                    const encodedFile = encodeURI(fileName.trim());
                    return `[${text}](${encodedFile})`;
                });

                const basePath = file.substring(0, file.lastIndexOf('/') + 1);
                const renderer = new marked.Renderer();

                // 2. Pfade anpassen (deine bestehende Logik)
                renderer.image = function(href, title, text) {
                    // Falls durch encodeURI %20 drin ist, ist das für den Browser okay.
                    // Wir hängen nur den Pfad davor.
                    let finalHref = href;
                    if (!href.startsWith('http') && !href.startsWith('/')) {
                        finalHref = basePath + href;
                    }
                    return `<img src="${finalHref}" alt="${text}" ${title ? `title="${title}"` : ''}>`;
                };

                renderer.link = function(href, title, text) {
                    let finalHref = href;
                    if (!href.startsWith('http') && !href.startsWith('/')) {
                        finalHref = basePath + href;
                    }
                    return `<a href="${finalHref}" ${title ? `title="${title}"` : ''}>${text}</a>`;
                };

                // 3. Parsen mit dem Renderer
                // Nutze das Objekt-Format für modernere marked-Versionen
                container.innerHTML = marked.parse(processedMarkdown, { renderer: renderer });
            })
            .catch(error => {
                container.innerHTML = `<p style="color: red;">Fehler: ${error.message}</p>`;
                console.error('Markdown-Loader-Fehler:', error);
            });
        }
    });
});
