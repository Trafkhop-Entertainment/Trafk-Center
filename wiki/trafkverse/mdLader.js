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

                const resolvePath = (path) => {
                    if (typeof path !== 'string') return path;
                    if (!path.startsWith('http') && !path.startsWith('/')) {
                        return basePath + path;
                    }
                    return path;
                };

                // Renderer für Bilder und Links
                renderer.image = function(token, title, text) {
                    let href = (typeof token === 'object') ? token.href : token;
                    let alt = (typeof token === 'object') ? token.text : text;
                    const finalHref = resolvePath(href);
                    return `<img src="${finalHref || ''}" alt="${alt || ''}">`;
                };

                renderer.link = function(token, title, text) {
                    let href = (typeof token === 'object') ? token.href : token;
                    let linkText = (typeof token === 'object') ? token.text : text;
                    const finalHref = resolvePath(href);
                    return `<a href="${finalHref || ''}">${linkText || ''}</a>`;
                };

                // Markdown parsen
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = marked.parse(processedMarkdown, {
                    renderer: renderer,
                    breaks: true,
                    gfm: true
                });

                // --- STRUKTUR-LOGIK: Header INSIDE Content ---
                const finalFragment = document.createDocumentFragment();
                let currentContentDiv = null;

                Array.from(tempDiv.children).forEach(child => {
                    if (child.tagName === 'H1') {
                        // Neue Content-Box erstellen
                        currentContentDiv = document.createElement('div');
                        currentContentDiv.className = 'content md';
                        finalFragment.appendChild(currentContentDiv);

                        // Den Header-Container erstellen und INSIDE die Content-Box schieben
                        const headerWrapper = document.createElement('div');
                        headerWrapper.className = 'header';
                        headerWrapper.appendChild(child.cloneNode(true));
                        currentContentDiv.appendChild(headerWrapper);
                    } else {
                        // Fallback, falls Text vor dem ersten H1 steht
                        if (!currentContentDiv) {
                            currentContentDiv = document.createElement('div');
                            currentContentDiv.className = 'content md';
                            finalFragment.appendChild(currentContentDiv);
                        }
                        currentContentDiv.appendChild(child.cloneNode(true));
                    }
                });
                // Ersetze den Container durch die neuen .content.md-Boxen
                const parent = container.parentNode;
                if (parent) {
                    // Füge alle neuen Boxen direkt vor dem Container ein
                    while (finalFragment.firstChild) {
                        parent.insertBefore(finalFragment.firstChild, container);
                    }
                    // Entferne den leeren Container
                    parent.removeChild(container);
                }
            })
            .catch(error => {
                container.innerHTML = `<p style="color: red;">Fehler: ${error.message}</p>`;
                console.error('Markdown-Loader-Fehler:', error);
            });
        }
    });
});