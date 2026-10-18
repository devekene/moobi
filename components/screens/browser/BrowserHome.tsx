import { useEffect } from "react";
import BrowserNews from "./BrowserNews";
import { LuGlobe } from "react-icons/lu";
import { SiWikipedia, SiGithub, SiFigma, SiYoutube } from "react-icons/si";
import { useBrowserStore } from "@/stores/useBrowserStore";
import styles from "./browser.module.css";

const favorites = [
  { name: "Wikipedia", url: "https://www.wikipedia.org", icon: SiWikipedia },
  { name: "YouTube", url: "https://www.youtube.com", icon: SiYoutube },
  { name: "GitHub", url: "https://github.com", icon: SiGithub },
  { name: "Figma", url: "https://www.figma.com", icon: SiFigma },
];
export default function BrowserHome() {
  const open = useBrowserStore((state) => state.setSelectedUrl);
  const fetchNews = useBrowserStore((state) => state.fetchNewsArticles);
  useEffect(() => {
    void fetchNews();
  }, [fetchNews]);
  return (
    <div className={styles.home}>
      <header className={styles.wordmark}>
        <LuGlobe size={18} /> mo<span className={styles.wordmarkDot}>.</span>
      </header>
      <div className={styles.hero}>
        <div className={styles.orbit} aria-hidden="true">
          <div className={styles.globe}>
            <i />
            <i />
            <i />
            <b />
            <b />
          </div>
          <span />
        </div>
        <h1>
          Where to<span> next?</span>
        </h1>
      </div>
      <section className={styles.favorites} aria-label="Favorites">
        {favorites.map(({ name, url, icon: Icon }) => (
          <button key={name} onClick={() => open({ title: name, link: url })}>
            <span className={styles.favoriteIcon}>
              <Icon size={25} />
            </span>
            <span>{name}</span>
          </button>
        ))}
      </section>
      <BrowserNews />
    </div>
  );
}
