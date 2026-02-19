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
                // Wir nutzen encodeURI, um Leerzeichen in Pfaden für den Parser "lesbar" zu machen.
                let processedMarkdown = markdown.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, fileName, altText) => {
                    const alt = altText || fileName;
                    const encodedFile = encodeURI(fileName.trim());
                    return `![${alt}](${encodedFile})`;
                });

                processedMarkdown = processedMarkdown.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, fileName, linkText) => {
                    const text = linkText || fileName;
                    const encodedFile = encodeURI(fileName.trim());
                    return `[${text}](${encodedFile})`;
                });

                const basePath = file.substring(0, file.lastIndexOf('/') + 1);
                const renderer = new marked.Renderer();

                // 2. Renderer für Bilder (Repariert für marked v7+)
                renderer.image = function(arg1, arg2, arg3) {
                    // Falls marked ein Objekt übergibt (neuere Versionen)
                    let href = typeof arg1 === 'object' ? arg1.href : arg1;
                    let text = typeof arg1 === 'object' ? arg1.text : arg3;
                    let title = typeof arg1 === 'object' ? arg1.title : arg2;

                    if (href && !href.startsWith('http') && !href.startsWith('/')) {
                        href = basePath + href;
                    }
                    return `<img src="${href}" alt="${text || ''}" ${title ? `title="${title}"` : ''}>`;
                };

                // 3. Renderer für Links (Repariert für marked v7+)
                renderer.link = function(arg1, arg2, arg3) {
                    let href = typeof arg1 === 'object' ? arg1.href : arg1;
                    let text = typeof arg1 === 'object' ? arg1.text : arg3;
                    let title = typeof arg1 === 'object' ? arg1.title : arg2;

                    if (href && !href.startsWith('http') && !href.startsWith('/')) {
                        href = basePath + href;
                    }
                    return `<a href="${href}" ${title ? `title="${title}"` : ''}>${text}</a>`;
                };

                // Parsen mit dem angepassten Renderer
                container.innerHTML = marked.parse(processedMarkdown, { renderer });
            })
            .catch(error => {
                container.innerHTML = `<p style="color: red;">Fehler: ${error.message}</p>`;
                console.error('Markdown-Loader-Fehler:', error);
            });
        }
    });
});
