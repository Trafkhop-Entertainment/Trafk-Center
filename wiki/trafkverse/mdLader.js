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
                        currentContentDiv = document.createElement('div');
                        currentContentDiv.className = 'content md';

                        // ID von H1 auf die Content-Box übertragen für Anker-Links
                        if (child.id) {
                            currentContentDiv.id = child.id;
                            child.removeAttribute('id');
                        }

                        finalFragment.appendChild(currentContentDiv);

                        const headerWrapper = document.createElement('div');
                        headerWrapper.className = 'header';
                        headerWrapper.appendChild(child.cloneNode(true));
                        currentContentDiv.appendChild(headerWrapper);
                    } else {
                        if (!currentContentDiv) {
                            currentContentDiv = document.createElement('div');
                            currentContentDiv.className = 'content md';
                            finalFragment.appendChild(currentContentDiv);
                        }
                        currentContentDiv.appendChild(child.cloneNode(true));
                    }
                });

                // --- DOM AKTUALISIERUNG ---
                const parent = container.parentNode;
                if (parent) {
                    while (finalFragment.firstChild) {
                        parent.insertBefore(finalFragment.firstChild, container);
                    }
                    parent.removeChild(container);

                    // --- NEU: ANKER-SCROLLING NACH LADEN ---
                    // Wir warten einen winzigen Moment (setTimeout), damit der Browser das Layout berechnen kann
                    setTimeout(() => {
                        const currentHash = window.location.hash;
                        if (currentHash) {
                            const targetElement = document.querySelector(currentHash);
                            if (targetElement) {
                                targetElement.scrollIntoView({ behavior: 'smooth' });
                            }
                        }
                    }, 100);
                }
            })
            .catch(error => {
                container.innerHTML = `<p style="color: red;">Fehler: ${error.message}</p>`;
                console.error('Markdown-Loader-Fehler:', error);
            });
        }
    });
});
