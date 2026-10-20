"use client";

import { useRef, useState, type RefObject } from "react";
import Image from "next/image";
import {
  LuArrowLeft,
  LuArrowUpRight,
  LuCheck,
  LuChevronLeft,
  LuChevronRight,
  LuCode,
  LuLayers,
  LuX,
} from "react-icons/lu";
import type { RegisteredMiniApp } from "@/lib/app-registry";
import AppIcon from "./AppIcon";
import StoreArtwork from "./StoreArtwork";
import styles from "./store.module.css";

export default function AppDetails({
  app,
  onBack,
  onOpen,
  headingRef,
}: {
  app: RegisteredMiniApp;
  onBack: () => void;
  onOpen: () => void;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const screenshotTrigger = useRef<HTMLButtonElement | null>(null);
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [galleryPosition, setGalleryPosition] = useState({
    atStart: true,
    atEnd: false,
  });
  const screenshots = app.previewCapabilities.screenshotUrls ?? [];
  const listing = app.store;
  const scrollGallery = (direction: number) => {
    const gallery = galleryRef.current;
    gallery?.scrollBy({
      left: direction * gallery.clientWidth * 0.8,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  const closeScreenshot = () => {
    dialogRef.current?.close();
    screenshotTrigger.current?.focus();
  };

  return (
    <article className={styles.details}>
      <nav className={styles.detailNav} aria-label="App navigation">
        <button
          type="button"
          onClick={onBack}
          className={styles.back}
          aria-label="Back to App Store"
        >
          <LuArrowLeft aria-hidden="true" />
          <span>App Store</span>
        </button>
        <span className={styles.eyebrow}>THE COLLECTION</span>
      </nav>
      <header className={styles.detailHeader}>
        <AppIcon app={app} large />
        <div>
          <span className={styles.eyebrow}>{app.category}</span>
          <h1 ref={headingRef} tabIndex={-1}>
            {app.name}
          </h1>
          <p>{listing?.tagline ?? app.description}</p>
        </div>
      </header>
      <div className={styles.launchRow}>
        <button type="button" className={styles.primaryButton} onClick={onOpen}>
          {app.availability === "available" ? "Open app" : "Open preview"}
          <LuArrowUpRight aria-hidden="true" />
        </button>
        <span>
          Included in Moobi
          <br />
          <strong>Ready to open</strong>
        </span>
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>
            <LuLayers aria-hidden="true" />
            Category
          </dt>
          <dd>{app.category}</dd>
        </div>
        <div>
          <dt>
            <LuCode aria-hidden="true" />
            Version
          </dt>
          <dd>{app.version}</dd>
        </div>
        <div>
          <dt>Made for</dt>
          <dd>Moobi</dd>
        </div>
      </dl>
      <div className={styles.detailHero}>
        <StoreArtwork id={app.id} />
        <h2>{listing?.headline ?? app.name}</h2>
      </div>
      {screenshots.length > 0 && (
        <section className={styles.screenshots} aria-label="App screenshots">
          <header className={styles.sectionHeading}>
            <h2>A closer look</h2>
            {screenshots.length > 1 && (
              <div className={styles.galleryControls}>
                <button
                  type="button"
                  aria-label="Previous screenshot"
                  disabled={galleryPosition.atStart}
                  onClick={() => scrollGallery(-1)}
                >
                  <LuChevronLeft aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Next screenshot"
                  disabled={galleryPosition.atEnd}
                  onClick={() => scrollGallery(1)}
                >
                  <LuChevronRight aria-hidden="true" />
                </button>
              </div>
            )}
          </header>
          <div
            onScroll={(event) => {
              const gallery = event.currentTarget;
              setGalleryPosition({
                atStart: gallery.scrollLeft <= 1,
                atEnd:
                  gallery.scrollLeft + gallery.clientWidth >=
                  gallery.scrollWidth - 1,
              });
            }}
            className={styles.gallery}
            ref={galleryRef}
            tabIndex={0}
            aria-label="Scroll app screenshots"
          >
            {screenshots.map((url, index) => (
              <figure key={url}>
                <button
                  type="button"
                  aria-label={`Enlarge ${app.name} screenshot ${index + 1}`}
                  onClick={(event) => {
                    screenshotTrigger.current = event.currentTarget;
                    setActiveScreenshot(index);
                    dialogRef.current?.showModal();
                  }}
                >
                  <Image
                    src={url}
                    alt={`${app.name}: ${listing?.previewCaptions[index] ?? "app screen"}`}
                    width={360}
                    height={760}
                    sizes="180px"
                    className={styles.screenshot}
                  />
                </button>
                <figcaption>
                  {listing?.previewCaptions[index] ?? `Inside ${app.name}`}
                </figcaption>
              </figure>
            ))}
          </div>
          <dialog
            ref={dialogRef}
            className={styles.lightbox}
            onClick={(event) => {
              if (event.target === event.currentTarget) closeScreenshot();
            }}
            onCancel={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeScreenshot();
            }}
            aria-label={`${app.name} screenshot`}
          >
            <button
              type="button"
              autoFocus
              aria-label="Close screenshot"
              onClick={closeScreenshot}
            >
              <LuX aria-hidden="true" />
            </button>
            <Image
              src={screenshots[activeScreenshot]}
              alt={`${app.name} screenshot ${activeScreenshot + 1}`}
              width={360}
              height={760}
              sizes="(max-width: 600px) 80vw, 360px"
            />
          </dialog>
        </section>
      )}
      <section className={styles.about}>
        <span className={styles.eyebrow}>A LITTLE MORE ABOUT IT</span>
        <h2>Meet {app.name}.</h2>
        <p>{listing?.story ?? app.description}</p>
        <ul>
          {listing?.highlights.map((item) => (
            <li key={item}>
              <LuCheck aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.information}>
        <h2>Good to know</h2>
        <dl>
          <div>
            <dt>Developer</dt>
            <dd>Moobi</dd>
          </div>
          <div>
            <dt>Experience</dt>
            <dd>Bundled mini app</dd>
          </div>
          <div>
            <dt>Availability</dt>
            <dd>
              {app.availability === "available" ? "Ready to open" : "Preview"}
            </dd>
          </div>
        </dl>
        <p>Opens right here in your virtual phone.</p>
      </section>
    </article>
  );
}
