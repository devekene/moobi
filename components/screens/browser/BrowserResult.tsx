import { useState } from "react";
import { LuGlobe } from "react-icons/lu";
import type { CustomSearchResultData } from "@/types";
import { browserHost, browserUrl } from "@/lib/browser";
import styles from "./browser.module.css";

export default function BrowserResult({
  result,
  onOpen,
}: {
  result: CustomSearchResultData;
  onOpen: () => void;
}) {
  const [failedIcon, setFailedIcon] = useState(false);
  const favicon = result.favicon ? browserUrl(result.favicon) : null;
  return (
    <button className={styles.result} onClick={onOpen}>
      <span className={styles.resultSource}>
        <span className={styles.resultFavicon} aria-hidden="true">
          {favicon && !failedIcon ? (
            <img
              src={favicon}
              alt=""
              width={22}
              height={22}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setFailedIcon(true)}
            />
          ) : (
            <LuGlobe size={20} />
          )}
        </span>
        <span className={styles.resultIdentity}>
          <strong>{result.siteName || browserHost(result.link)}</strong>
          <small>{result.formattedUrl || result.link}</small>
        </span>
      </span>
      <h2>{result.title}</h2>
      {result.snippet && <p>{result.snippet}</p>}
    </button>
  );
}
