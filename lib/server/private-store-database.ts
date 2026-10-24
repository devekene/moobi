export type AppRow = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  created_at: string;
};
export type ReleaseRow = {
  id: string;
  app_id: string;
  version: string;
  digest: string;
  byte_size: number;
  package_path: string;
  status: "draft" | "published";
  created_at: string;
};
export type PublicationRow = {
  release_id: string;
  status: "pending" | "approved" | "rejected" | "revoked";
  notes: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
};
export type ControlRow = { app_id: string; suspended: boolean; reason: string };
type Table<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};
export interface PrivateStoreDatabase {
  public: {
    Tables: {
      store_publications: Table<
        PublicationRow,
        Pick<PublicationRow, "release_id" | "status">
      >;
      store_app_controls: Table<ControlRow, ControlRow>;
      private_apps: Table<
        AppRow,
        Pick<AppRow, "id" | "owner_id" | "name" | "description">
      >;
      private_releases: Table<
        ReleaseRow,
        Omit<ReleaseRow, "id" | "created_at">
      >;
      private_app_members: Table<
        { app_id: string; user_id: string },
        { app_id: string; user_id: string }
      >;
      private_library: Table<
        { user_id: string; app_id: string; acquired_at: string },
        { user_id: string; app_id: string }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      store_release_available: {
        Args: { target_release: string };
        Returns: boolean;
      };
      submit_store_release: {
        Args: { target_release: string; actor: string };
        Returns: undefined;
      };
      review_store_release: {
        Args: {
          target_release: string;
          actor: string;
          decision: string;
          review_notes: string;
        };
        Returns: undefined;
      };
      grant_private_app: {
        Args: { target_app: string; member_email: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
