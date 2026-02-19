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
                // --- NEU: Obsidian Wiki-Link Support ---
                // Sucht nach ![[bild.png]] oder ![[bild.png|alt-text]]
                // Und wandelt es um in ![alt-text](bild.png)
                let processedMarkdown = markdown.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, fileName, altText) => {
                    const alt = altText || fileName;
                    return `![${alt}](${fileName})`;
                });

                // Falls du auch normale Wiki-Links [[Seite]] unterstützen willst:
                processedMarkdown = processedMarkdown.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, fileName, linkText) => {
                    const text = linkText || fileName;
                    return `[${text}](${fileName})`;
                });
                // ---------------------------------------

                const basePath = file.substring(0, file.lastIndexOf('/') + 1);
                const renderer = new marked.Renderer();

                renderer.image = function(href, title, text) {
                    if (!href.startsWith('http') && !href.startsWith('/')) {
                        href = basePath + href;
                    }
                    return `<img src="${href}" alt="${text}" ${title ? `title="${title}"` : ''}>`;
                };

                renderer.link = function(href, title, text) {
                    if (!href.startsWith('http') && !href.startsWith('/')) {
                        href = basePath + href;
                    }
                    return `<a href="${href}" ${title ? `title="${title}"` : ''}>${text}</a>`;
                };

                // Wichtig: Nutze hier das 'processedMarkdown'
                container.innerHTML = marked.parse(processedMarkdown, { renderer });
            })
            .catch(error => {
                container.innerHTML = `<p style="color: red;">Fehler: ${error.message}</p>`;
                console.error('Markdown-Loader-Fehler:', error);
            });
        }
    });
});
