"use client";
import * as Menu from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import { LuEllipsis } from "react-icons/lu";
import styles from "./Notes.module.css";

export function NotesMenu({ children }: { children: ReactNode }) {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger className={styles.round} aria-label="More options">
        <LuEllipsis />
      </Menu.Trigger>
      <Menu.Content
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className={styles.menu}
      >
        {children}
      </Menu.Content>
    </Menu.Root>
  );
}
export function MenuAction({
  children,
  onSelect,
  danger = false,
}: {
  children: ReactNode;
  onSelect: () => void;
  danger?: boolean;
}) {
  return (
    <Menu.Item
      className={`${styles.menuItem} ${danger ? styles.danger : ""}`}
      onSelect={onSelect}
    >
      {children}
    </Menu.Item>
  );
}
