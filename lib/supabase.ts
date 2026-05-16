import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export function hasSupabaseConfig(): boolean {
  return supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
