import { describe, expect, it } from "vitest";
import { scrollCalendarSheet } from "@/components/screens/calendar/scrollSheet";

const viewport = (scrollHeight = 800, clientHeight = 400, scrollTop = 0) => ({
  scrollHeight,
  clientHeight,
  scrollTop,
});
const wheel = (deltaY: number, deltaMode = 0) => ({
  deltaY,
  deltaMode,
  deltaX: 0,
  ctrlKey: false,
});

describe("Calendar sheet scrolling", () => {
  it("reaches the submit area and returns to the top without moving past either edge", () => {
    const sheet = viewport();
    expect(scrollCalendarSheet(sheet, wheel(900))).toBe(true);
    expect(sheet.scrollTop).toBe(400);
    expect(scrollCalendarSheet(sheet, wheel(40))).toBe(true);
    expect(sheet.scrollTop).toBe(400);
    scrollCalendarSheet(sheet, wheel(-900));
    expect(sheet.scrollTop).toBe(0);
  });
  it("supports mouse line units and trackpad/page units", () => {
    const sheet = viewport(2000);
    scrollCalendarSheet(sheet, wheel(3, 1));
    expect(sheet.scrollTop).toBe(48);
    scrollCalendarSheet(sheet, wheel(0.5, 2));
    expect(sheet.scrollTop).toBe(248);
    scrollCalendarSheet(sheet, wheel(7.5));
    expect(sheet.scrollTop).toBe(255.5);
  });
  it("scrolls long notes first and resumes the sheet at the textarea boundary", () => {
    const sheet = viewport();
    const notes = viewport(300, 100);
    scrollCalendarSheet(sheet, wheel(300), notes);
    expect(notes.scrollTop).toBe(200);
    expect(sheet.scrollTop).toBe(0);
    scrollCalendarSheet(sheet, wheel(80), notes);
    expect(sheet.scrollTop).toBe(80);
    scrollCalendarSheet(sheet, wheel(-50), notes);
    expect(notes.scrollTop).toBe(150);
    expect(sheet.scrollTop).toBe(80);
  });
  it("leaves zoom and horizontal gestures to the browser", () => {
    const sheet = viewport();
    expect(scrollCalendarSheet(sheet, { ...wheel(100), ctrlKey: true })).toBe(
      false,
    );
    expect(scrollCalendarSheet(sheet, { ...wheel(20), deltaX: 100 })).toBe(
      false,
    );
    expect(scrollCalendarSheet(sheet, wheel(0))).toBe(false);
    expect(sheet.scrollTop).toBe(0);
  });
  it("contains wheel gestures even when the form fits without scrolling", () => {
    const sheet = viewport(200, 400);
    expect(scrollCalendarSheet(sheet, wheel(100))).toBe(true);
    expect(sheet.scrollTop).toBe(0);
  });
});
