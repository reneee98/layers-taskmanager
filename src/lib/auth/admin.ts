import { createClient } from "@/lib/supabase/server";
import { UserProfile } from "@/types/user";

export async function getServerUser(): Promise<{ id: string; email: string } | null> {
  const supabase = createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return {
    id: user.id,
    email: user.email || '',
  };
}

export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .rpc('is_admin', { uid: userId });
  
  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
  
  return data === true;
}

export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const user = await getServerUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  const adminStatus = await isAdmin(user.id);
  
  if (!adminStatus) {
    throw new Error('Admin access required');
  }
  
  return user;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
  
  return data;
}
