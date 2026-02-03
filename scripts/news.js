import { NanopubClient } from "https://esm.sh/@nanopub/nanopub-js@0.1.0";
import DOMPurify from "https://esm.sh/dompurify@3.3.1";

export async function showNewsItems() {
  const client = new NanopubClient({
    endpoints: ["https://query.knowledgepixels.com/"],
  });

  const container =
    document.querySelector("section[data-year] ul") ||
    document.getElementById("news-container");

  const stopLoading = showLoadingMessage(container);

  try {
    for await (const row of client.runQueryTemplate(
      "RAOGCU2nQzZ0aE2iXwJ20jJtnZsjVR0pfFg0qlSxYtBIA/get-news-content",
      { resource: "https://w3id.org/spaces/knowledgepixels" }
    )) {
      stopLoading();

      const year = row.datePublished
        ? new Date(row.datePublished).getFullYear()
        : new Date().getFullYear();

      const ul = getYearList(year);
      const li = buildNewsItem(row);

      insertChronologically(ul, li);
    }
  } catch (err) {
    stopLoading();
    console.error(err);
  }
}

export function buildNewsItem({ text, link, np, datePublished }) {
  const li = document.createElement("li");
  const span = document.createElement("span");

  if (text) {
    const clean = DOMPurify.sanitize(text);
    const doc = new DOMParser().parseFromString(clean, "text/html");
    span.append(...doc.body.childNodes);
  }

  if (link) {
    const a = document.createElement("a");
    a.href = link;
    a.rel = "nofollow";
    a.textContent = link;
    const inner = span.querySelector("span");
    if (inner) {
      const whiteSpace = document.createTextNode(" ");
      inner.appendChild(whiteSpace);
      inner.appendChild(a);
    } else {
      span.appendChild(a);
    }
  }

  li.appendChild(span);

  if (datePublished) li.dataset.date = datePublished;
  if (np) li.dataset.nanopub = np;

  return li;
}

function getYearList(year) {
  let section = document.querySelector(`section[data-year="${year}"]`);

  if (!section) {
    section = document.createElement("section");
    section.dataset.year = year;

    const h3 = document.createElement("h3");
    h3.textContent = year;

    const ul = document.createElement("ul");

    section.appendChild(h3);
    section.appendChild(ul);

    const all = [...document.querySelectorAll("section[data-year]")];
    const before = all.find((s) => Number(s.dataset.year) < year);

    document.body.insertBefore(section, before || null);
  }

  return section.querySelector("ul");
}

function insertChronologically(ul, li) {
  const date = li.dataset.date;

  if (!date) {
    ul.prepend(li);
    return;
  }

  const time = new Date(date).getTime();

  const existing = [...ul.children];
  const before = existing.find((el) => {
    const d = el.dataset.date;
    return d && new Date(d).getTime() < time;
  });

  ul.insertBefore(li, before || null);
}

export async function showLatestNews(limit = 3) {
  const ul = document.getElementById("latest-news");
  const stopLoading = showLoadingMessage(ul);

  const client = new NanopubClient({
    endpoints: ["https://query.knowledgepixels.com/"],
  });

  const rows = [];

  try {
    for await (const row of client.runQueryTemplate(
      "RAOGCU2nQzZ0aE2iXwJ20jJtnZsjVR0pfFg0qlSxYtBIA/get-news-content",
      { resource: "https://w3id.org/spaces/knowledgepixels" }
    )) {
      rows.push(row);
    }

    stopLoading();

    rows
      .sort((a, b) => {
        if (!a.datePublished) return 1;
        if (!b.datePublished) return -1;
        return new Date(b.datePublished) - new Date(a.datePublished);
      })
      .slice(0, limit)
      .forEach((row) => {
        ul.appendChild(buildNewsItem(row));
      });
  } catch (err) {
    stopLoading();
    console.error(err);
  }
}

function showLoadingMessage(container, text = "Fetching news") {
  const li = document.createElement("li");
  li.className = "news-loading";
  li.textContent = text;

  let dots = 0;
  const interval = setInterval(() => {
    dots = (dots + 1) % 4;
    li.textContent = text + ".".repeat(dots);
  }, 400);

  container.appendChild(li);

  return () => {
    clearInterval(interval);
    li.remove();
  };
}
