// Backend disabled: provide a minimal supabase stub to avoid network calls.
// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase: any = {
  auth: {
    async signInWithPassword() { return { data: null, error: null }; },
    async signUp() { return { data: null, error: null }; },
    async signOut() { return { error: null }; },
    async getSession() { return { data: { session: null }, error: null }; },
    async getUser() { return { data: { user: null }, error: null }; },
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
    async signInWithOAuth() { return { data: null, error: null }; },
    async resend() { return { data: null, error: null }; },
  },
  from(_table: string) {
    const chain: any = {
      select(_cols?: any) { return Promise.resolve({ data: [], error: null }); },
      eq(_col: any, _val: any) { return chain; },
      in(_col: any, _arr: any) { return chain; },
      ilike(_col: any, _pattern: any) { return chain; },
      order(_col: any, _opts?: any) { return chain; },
      range(_from: number, _to: number) { return chain; },
      insert(_values: any) { return Promise.resolve({ data: [], error: null }); },
      update(_values: any) { return Promise.resolve({ data: [], error: null }); },
      delete() { return Promise.resolve({ data: [], error: null }); },
      single() { return Promise.resolve({ data: null, error: null }); },
      maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    };
    return chain;
  },
  storage: {
    from(_bucket: string) {
      return {
        async upload() { return { data: null, error: null }; },
        async remove() { return { data: null, error: null }; },
        async list() { return { data: [], error: null }; },
        getPublicUrl(_path: string) { return { data: { publicUrl: "" } }; },
      };
    },
  },
};