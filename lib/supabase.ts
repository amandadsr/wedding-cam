import { createClient } from "@supabase/supabase-js";

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          slug: string;
          name: string;
          reveal_at: string;
          created_at: string;
          admin_token: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          reveal_at: string;
          created_at?: string;
          admin_token: string;
        };
      };
      photos: {
        Row: {
          id: string;
          event_id: string;
          storage_path: string;
          guest_name: string | null;
          taken_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          storage_path: string;
          guest_name?: string | null;
          taken_at?: string;
        };
      };
    };
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
