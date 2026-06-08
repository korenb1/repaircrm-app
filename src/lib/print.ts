// Opens rendered document HTML in a new window and triggers the browser print
// dialog. Used to print ticket documents (acceptance act, completion act,
// invoice) filled from a template with real ticket data.
export function printHtml(title: string, bodyHtml: string): void {
  const win = window.open("", "_blank", "width=900,height=1200");
  if (!win) return;

  win.document.write(
    `<!doctype html><html lang="uk"><head><meta charset="utf-8">` +
      `<title>${title}</title><style>` +
      "@page{margin:8mm}" +
      "body{font-family:system-ui,-apple-system,Arial,sans-serif;font-size:13px;color:#000;line-height:1.45}" +
      "p{margin:0}" +
      "table{border-collapse:collapse}" +
      "td,th{border:0px}" +
      "img{max-width:100%}" +
      ".page-break{page-break-after:always}" +
      `</style></head><body>${bodyHtml.replace(
        /<!--\s*pagebreak\s*-->/g,
        '<div class="page-break"></div>',
      )}</body></html>`,
  );
  win.document.close();
  win.focus();

  // document.write content has no load event we can rely on cross-browser;
  // a short delay lets layout/images settle before printing.
  win.setTimeout(() => {
    win.print();
  }, 300);
}
