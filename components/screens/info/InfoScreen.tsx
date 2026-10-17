import { LuAppWindow, LuCode, LuShieldCheck } from "react-icons/lu";
import { SettingsSection } from "../settings/SettingsDetails";
import styles from "../settings/settings.module.css";

export default function InfoScreen({
  showHeading = true,
}: {
  showHeading?: boolean;
}) {
  return (
    <div className={styles.aboutScreen}>
      {showHeading && <h1 className={styles.title}>About</h1>}
      <div className={styles.aboutHero}>
        <span className={styles.brandMark} aria-hidden="true">
          m<span />
        </span>
        <h2>Moobi</h2>
        <p>A little world of apps.</p>
        <span className={styles.versionBadge}>Version 1.0.1</span>
      </div>
      <SettingsSection title="Made for exploring">
        <div className={styles.explainer}>
          <LuAppWindow aria-hidden="true" />
          <div>
            <h3>Your pocket playground</h3>
            <p>
              Discover mini apps and make a virtual phone feel like your own.
            </p>
          </div>
        </div>
        <div className={styles.explainer}>
          <LuShieldCheck aria-hidden="true" />
          <div>
            <h3>A virtual experience</h3>
            <p>
              Battery, charging, connectivity, and phone controls are browser
              simulations. They do not change your actual device.
            </p>
          </div>
        </div>
      </SettingsSection>
      <SettingsSection title="The maker">
        <div className={styles.infoRow}>
          <span>Developer</span>
          <span>Epiphanus</span>
        </div>
        <div className={styles.infoRow}>
          <span>Codename</span>
          <span>Patron</span>
        </div>
      </SettingsSection>
      <p className={styles.aboutFooter}>
        <LuCode aria-hidden="true" />
        Built for curiosity.
      </p>
    </div>
  );
}
