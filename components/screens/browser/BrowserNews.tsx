import { useState } from "react";
import { LuArrowUpRight, LuGlobe, LuRefreshCw } from "react-icons/lu";
import { useBrowserStore } from "@/stores/useBrowserStore";
import { browserUrl } from "@/lib/browser";
import type { NewsArticle } from "@/types";
import styles from "./browser.module.css";

function NewsCard({ article }: { article: NewsArticle }) {
  const [imageFailed, setImageFailed] = useState(false);
  const open = useBrowserStore((state) => state.setSelectedUrl);
  const image = browserUrl(article.image || "");
  return (
    <button
      className={styles.newsCard}
      onClick={() => open({ title: article.title, link: article.url })}
    >
      <span className={styles.newsImage}>
        {image && !imageFailed ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <LuGlobe size={28} />
        )}
      </span>
      <span className={styles.newsCopy}>
        <small>
          {article.source.name}
          <LuArrowUpRight size={14} />
        </small>
        <strong>{article.title}</strong>
      </span>
    </button>
  );
}
export default function BrowserNews() {
  const articles = useBrowserStore((state) => state.newsArticles);
  const status = useBrowserStore((state) => state.newsStatus);
  const fetchNews = useBrowserStore((state) => state.fetchNewsArticles);
  return (
    <section
      className={styles.news}
      aria-label="News"
      aria-busy={status === "loading"}
    >
      <div className={styles.newsHeading}>
        <h2>News</h2>
        <button
          aria-label="Refresh news"
          disabled={status === "loading"}
          onClick={() => void fetchNews(true)}
        >
          <LuRefreshCw size={16} />
        </button>
      </div>
      {(status === "idle" || status === "loading") && !articles.length && (
        <div
          className={styles.newsLoading}
          role="status"
          aria-label="Loading news"
        >
          <span />
          <span />
        </div>
      )}
      {status === "error" && (
        <div className={styles.newsMessage} role="status">
          <span>News unavailable</span>
          <button onClick={() => void fetchNews(true)}>Retry</button>
        </div>
      )}
      {status === "ready" && !articles.length && (
        <p className={styles.newsMessage}>No stories right now</p>
      )}
      {articles.map((article) => (
        <NewsCard key={article.url} article={article} />
      ))}
    </section>
  );
}
