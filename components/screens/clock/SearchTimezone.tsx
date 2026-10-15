"use client";

import { useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LuCheck, LuSearch, LuX } from "react-icons/lu";
import { useClock } from "@/context/ClockContext";
import {
  addClockCity,
  getClockCityCatalog,
  getClockCityKey,
  getClockCountryName,
  groupClockCities,
  type ClockCity,
} from "@/lib/world-clock";
import styles from "./SearchTimezone.module.css";

const SearchTimezone = ({
  container,
  onClose,
}: {
  container?: HTMLDivElement | null;
  onClose: () => void;
}) => {
  const { selectedTimezones, setSelectedTimezones } = useClock();
  const [cities] = useState(getClockCityCatalog);
  const [search, setSearch] = useState("");
  const [letterIndex, setLetterIndex] = useState(0);
  const headings = useRef(new Map<string, HTMLHeadingElement>());
  const scroller = useRef<HTMLDivElement | null>(null);
  const searchInput = useRef<HTMLInputElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const groups = useMemo(
    () => groupClockCities(cities, search),
    [cities, search],
  );
  const selected = new Set(selectedTimezones.map(getClockCityKey));

  const choose = (city: ClockCity) => {
    setSelectedTimezones((previous) => addClockCity(previous, city));
    onClose();
  };
  const jumpTo = (index: number) => {
    setLetterIndex(index);
    const letter = groups[index]?.letter;
    if (letter)
      headings.current
        .get(letter)
        ?.scrollIntoView({ block: "start", behavior: "instant" });
  };

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal container={container}>
        <Dialog.Content
          className={styles.sheet}
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            if (document.activeElement instanceof HTMLElement)
              returnFocus.current = document.activeElement;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus();
          }}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <header className={styles.header}>
            <button
              type="button"
              className={styles.close}
              aria-label="Close city picker"
              onClick={onClose}
            >
              <LuX aria-hidden="true" />
            </button>
            <Dialog.Title className={styles.title}>Choose a City</Dialog.Title>
            <span aria-hidden="true" />
          </header>
          <div className={styles.scroller} ref={scroller}>
            {groups.length === 0 ? (
              <p className={styles.empty} role="status">
                No cities found. Try a city or country name.
              </p>
            ) : (
              groups.map(({ letter, cities: group }) => (
                <section
                  key={letter}
                  aria-label={`Cities starting with ${letter}`}
                >
                  <h2
                    className={styles.letter}
                    ref={(node) => {
                      if (node) headings.current.set(letter, node);
                      else headings.current.delete(letter);
                    }}
                  >
                    {letter}
                  </h2>
                  <ul>
                    {group.map((city) => (
                      <li key={getClockCityKey(city)}>
                        <button
                          type="button"
                          className={styles.city}
                          aria-label={`${city.city}, ${getClockCountryName(city.countryCode)}${selected.has(getClockCityKey(city)) ? ", already added" : ""}`}
                          onClick={() => choose(city)}
                        >
                          <span>
                            {city.city}, {getClockCountryName(city.countryCode)}
                          </span>
                          {selected.has(getClockCityKey(city)) && (
                            <LuCheck aria-hidden="true" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
          {!search && groups.length > 1 && (
            <div className={styles.index}>
              <div className={styles.indexLetters} aria-hidden="true">
                {groups.map(({ letter }) => (
                  <span key={letter}>{letter}</span>
                ))}
              </div>
              <input
                type="range"
                className={styles.indexInput}
                min={0}
                max={groups.length - 1}
                step={1}
                value={Math.min(letterIndex, groups.length - 1)}
                aria-label="Jump to city letter"
                aria-orientation="vertical"
                aria-valuetext={
                  groups[Math.min(letterIndex, groups.length - 1)]?.letter
                }
                onChange={(event) => jumpTo(Number(event.target.value))}
              />
            </div>
          )}
          <div className={styles.searchBar}>
            <LuSearch aria-hidden="true" />
            <input
              ref={searchInput}
              type="search"
              aria-label="Search cities or countries"
              placeholder="Search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setLetterIndex(0);
                scroller.current?.scrollTo({ top: 0 });
              }}
            />
            {search && (
              <button
                type="button"
                aria-label="Clear city search"
                onClick={() => {
                  setSearch("");
                  setLetterIndex(0);
                  scroller.current?.scrollTo({ top: 0 });
                  searchInput.current?.focus();
                }}
              >
                <LuX aria-hidden="true" />
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
export default SearchTimezone;
