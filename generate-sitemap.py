import os

base_url = "https://trafkhop-entertainment.github.io/Trafk-Center/"
directory = "."

# Definiere hier die erlaubten Dateiendungen
allowed_extensions = (".html", ".txt", ".md")

sitemap_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
sitemap_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

for root, dirs, files in os.walk(directory):
    for filename in files:
        # Hier prüfen wir nun gegen das Tuple
        if filename.endswith(allowed_extensions):
            rel_path = os.path.relpath(os.path.join(root, filename), directory)
            url_path = rel_path.replace("\\", "/")

            sitemap_content += f'  <url>\n'
            sitemap_content += f'    <loc>{base_url}{url_path}</loc>\n'
            sitemap_content += f'    <priority>0.80</priority>\n'
            sitemap_content += f'  </url>\n'

sitemap_content += '</urlset>'

with open("sitemap.xml", "w", encoding="utf-8") as f:
    f.write(sitemap_content)

print(f"✅ sitemap.xml wurde erstellt! (Erkannte Typen: {', '.join(allowed_extensions)})")
