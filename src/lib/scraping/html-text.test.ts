import { describe, expect, it } from "vitest";

import { htmlToPlainText } from "./html-text";

describe("htmlToPlainText", () => {
  it("puts the title and Open Graph tags first", () => {
    const html = `<html><head>
      <title>Développeur Fullstack Java Angular Vue 3 Nanterre (92) - Recrutement par Wysoc Consulting | Hellowork</title>
      <meta property="og:title" content="Wysoc Consulting - Développeur Fullstack Java Angular Vue 3" />
      <meta property="og:site_name" content="Hellowork" />
    </head><body><p>Description du poste ici.</p></body></html>`;

    const text = htmlToPlainText(html);

    expect(text).toContain("Title: Développeur Fullstack Java Angular Vue 3");
    expect(text).toContain(
      "OG title: Wysoc Consulting - Développeur Fullstack Java Angular Vue 3",
    );
    expect(text).toContain("OG site name: Hellowork");
    expect(text).toContain("Description du poste ici.");
  });

  it("strips <script>, <style>, <nav>, <footer> and their content", () => {
    const html = `<html><body>
      <nav>Menu</nav>
      <script>window.__DATA__ = { secret: true };</script>
      <style>.hidden { display: none }</style>
      <main>Contenu utile</main>
      <footer>Copyright 2026</footer>
    </body></html>`;

    const text = htmlToPlainText(html);

    expect(text).toContain("Contenu utile");
    expect(text).not.toContain("Menu");
    expect(text).not.toContain("__DATA__");
    expect(text).not.toContain("display: none");
    expect(text).not.toContain("Copyright 2026");
  });

  it("decodes HTML entities, including accented French letters", () => {
    const html =
      "<html><body><p>D&eacute;veloppeur &amp; Data &mdash; Paris, r&eacute;mun&eacute;ration &agrave; d&eacute;finir</p></body></html>";

    const text = htmlToPlainText(html);

    expect(text).toContain("Développeur & Data — Paris");
    expect(text).toContain("rémunération à définir");
  });

  it("decodes numeric and hex entities", () => {
    const html = "<html><body><p>&#233;t&#x00e9;</p></body></html>";

    const text = htmlToPlainText(html);

    expect(text).toBe("été");
  });

  it("collapses whitespace and trims", () => {
    const html = "<html><body>\n\n  <p>  Hello   world  </p>\n\n</body></html>";

    const text = htmlToPlainText(html);

    expect(text).toBe("Hello world");
  });

  it("truncates to maxChars", () => {
    const html = `<html><body><p>${"a".repeat(20)}</p></body></html>`;

    const text = htmlToPlainText(html, 10);

    expect(text).toHaveLength(10);
  });

  it("handles a page with no useful content (SPA shell)", () => {
    const html =
      '<html><head><title></title></head><body><div id="root"></div></body></html>';

    const text = htmlToPlainText(html);

    expect(text).toBe("");
  });
});
