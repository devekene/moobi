import { useBrowserStore } from "@/stores";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Loader from "@/components/Loader";

const BrowserIframe = () => {
  const { selectedUrl, changeBrowserScreen } = useBrowserStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isEmbeddable, setIsEmbeddable] = useState(true);

  useEffect(() => {
    if (!selectedUrl) return;

    let active = true;

    const checkIfEmbeddable = async () => {
      try {
        const res = await fetch(
          `/api/browser/ping?url=${encodeURIComponent(selectedUrl.link)}`,
        );
        const data = await res.json();
        if (active) setIsEmbeddable(data.status === "ok");
      } catch (err) {
        console.log(err);
        if (active) setIsEmbeddable(false);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void checkIfEmbeddable();
    return () => {
      active = false;
    };
  }, [selectedUrl]);

  if (!selectedUrl) {
    changeBrowserScreen("browser-search-results");
    return;
  }

  return (
    <div className="relative h-full w-full">
      {isLoading && (
        <div className="flex-center">
          <Loader />
        </div>
      )}

      {isEmbeddable ? (
        <iframe
          src={selectedUrl.link}
          className="h-full w-full rounded-lg"
          sandbox="allow-scripts allow-same-origin allow-popups"
        ></iframe>
      ) : (
        <div className="flex-center h-[90%] flex-col gap-4 px-6 text-white">
          <h1 className="text-center text-2xl">
            Site cannot be embedded in an iframe.
          </h1>
          <Button asChild variant="link" className="shimmer-btn">
            <Link
              href={selectedUrl.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg"
            >
              View in a new tab
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};
export default BrowserIframe;
