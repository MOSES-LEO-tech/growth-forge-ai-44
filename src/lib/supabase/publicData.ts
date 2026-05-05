import { supabase } from "@/integrations/supabase/client";

export async function invokePublicData<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("public-data", {
    body: { action, params },
  });

  if (error) throw error;
  if ((data as { error?: string } | null)?.error) {
    throw new Error((data as { error: string }).error);
  }

  return data as T;
}
