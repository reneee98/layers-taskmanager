import { createClient as createSupabaseClient, type User } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

import { createClient as createServerClient } from "@/lib/supabase/server";

const getBearerToken = (request: NextRequest) => {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
};

export const getAuthenticatedRequestContext = async (
  request: NextRequest
): Promise<{
  supabase: ReturnType<typeof createServerClient>;
  user: User | null;
}> => {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { supabase, user };
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  return {
    supabase: supabase as ReturnType<typeof createServerClient>,
    user: error ? null : user,
  };
};
