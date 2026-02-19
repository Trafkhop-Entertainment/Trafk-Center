document.addEventListener("DOMContentLoaded", () => {
    const containers = document.querySelectorAll('[data-markdown]');

    containers.forEach(container => {
        const file = container.getAttribute('data-markdown');

        if (file) {
            fetch(file)
            .then(response => {
                if (!response.ok) throw new Error(`Datei "${file}" konnte nicht geladen werden.`);
                return response.text();
            })
            .then(markdown => {
                // 1. Obsidian Wiki-Links Vorverarbeitung
                // Ersetzt ![[Bild.png]] durch ![Bild.png](Bild%20.png)
                let processedMarkdown = markdown.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, fileName, altText) => {
                    const encoded = encodeURI(fileName.trim());
                    return `![${altText || fileName}](${encoded})`;
                });

                processedMarkdown = processedMarkdown.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, fileName, linkText) => {
                    const encoded = encodeURI(fileName.trim());
                    return `[${linkText || fileName}](${encoded})`;
                });

                const basePath = file.substring(0, file.lastIndexOf('/') + 1);
                const renderer = new marked.Renderer();

                // Hilfsfunktion für die Pfad-Logik (Sicher gegen Nicht-Strings)
                const resolvePath = (path) => {
                    if (typeof path !== 'string') return path;
                    if (!path.startsWith('http') && !path.startsWith('/')) {
                        return basePath + path;
                    }
                    return path;
                };

                // 2. Neuer, robuster Image-Renderer
                renderer.image = function(token, title, text) {
                    let href, alt;

                    // PRÜFUNG: Ist 'token' ein Objekt (neue API) oder ein String (alte API)?
                    if (typeof token === 'object' && token !== null) {
                        href = token.href;
                        alt = token.text;
                        title = token.title;
                    } else {
                        href = token;
                        alt = text;
                    }

                    const finalHref = resolvePath(href);
                    return `<img src="${finalHref || ''}" alt="${alt || ''}" ${title ? `title="${title}"` : ''}>`;
                };

                // 3. Neuer, robuster Link-Renderer
                renderer.link = function(token, title, text) {
                    let href, linkText;

                    if (typeof token === 'object' && token !== null) {
                        href = token.href;
                        linkText = token.text;
                        title = token.title;
                    } else {
                        href = token;
                        linkText = text;
                    }

                    const finalHref = resolvePath(href);
                    return `<a href="${finalHref || ''}" ${title ? `title="${title}"` : ''}>${linkText || ''}</a>`;
                };

                // Markdown parsen mit dem neuen Renderer
                container.innerHTML = marked.parse(processedMarkdown, { renderer: renderer });
            })
            .catch(error => {
                container.innerHTML = `<p style="color: red;">Fehler: ${error.message}</p>`;
                console.error('Markdown-Loader-Fehler:', error);
            });
        }
    });
});
