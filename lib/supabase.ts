import { createClient } from './server';

/**
 * Helper to obtain a Supabase server client for API routes and Server Components.
 */
export const supabaseServer = async () => {
  return await createClient();
};

