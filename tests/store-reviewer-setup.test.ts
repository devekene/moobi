import { describe, expect, it } from "vitest";
import { addReviewerToEnvironment } from "../scripts/configure-store-reviewer.mjs";
import { OWNER, MEMBER } from "./private-store-fixtures";
describe("reviewer setup preserves local configuration", () => {
  it("keeps existing secret and unrelated values untouched while adding an idempotent reviewer", () => {
    const source = `# local settings\nSUPABASE_SECRET_KEY=example-private-value\nMOOBI_STORE_REVIEWER_IDS=${OWNER}\nOTHER="a=b"\n`;
    const result = addReviewerToEnvironment(source, MEMBER);
    expect(result).toContain("SUPABASE_SECRET_KEY=example-private-value\n");
    expect(result).toContain('OTHER="a=b"\n');
    expect(result).toContain(`MOOBI_STORE_REVIEWER_IDS=${OWNER},${MEMBER}\n`);
    expect(addReviewerToEnvironment(result, MEMBER)).toBe(result);
  });
  it("handles empty configuration and duplicate reviewer entries without shadowing the intended setting", () => {
    expect(addReviewerToEnvironment("", OWNER)).toBe(
      `MOOBI_STORE_REVIEWER_IDS=${OWNER}\n`,
    );
    const result = addReviewerToEnvironment(
      `A=1\r\nMOOBI_STORE_REVIEWER_IDS="${OWNER}"\r\nMOOBI_STORE_REVIEWER_IDS=${MEMBER}\r\n`,
      OWNER,
    );
    expect(result).toBe(
      `A=1\r\nMOOBI_STORE_REVIEWER_IDS=${OWNER},${MEMBER}\r\n`,
    );
  });
  it("rejects malformed IDs rather than silently granting or dropping authority", () => {
    expect(() => addReviewerToEnvironment("", "owner@example.test")).toThrow(
      "Invalid reviewer",
    );
    expect(() =>
      addReviewerToEnvironment("MOOBI_STORE_REVIEWER_IDS=not-a-uuid\n", OWNER),
    ).toThrow("invalid ID");
  });
});
