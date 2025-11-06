/**
 * Utility functions for role management and display
 */

/**
 * Get Slovak display name for a role
 * @param role - The role name (e.g., 'owner', 'admin', 'member') or custom role name
 * @returns Slovak translation of the role name, or the role name itself if it's a custom role
 */
export const getRoleDisplayName = (role: string | null | undefined): string => {
  if (!role) return "Člen";
  
  switch (role.toLowerCase()) {
    case 'owner':
      return 'Majiteľ';
    case 'member':
      return 'Člen';
    case 'admin':
      return 'Administrátor';
    case 'user':
      // Legacy role - map to 'member' for display
      return 'Člen';
    default:
      // If it's a UUID (custom role ID), return as-is (will be replaced with actual role name)
      // Otherwise return the role name (custom role name)
      return role;
  }
};

/**
 * Get role display name, considering if user is owner
 * @param role - The role name
 * @param isOwner - Whether the user is the workspace owner
 * @returns Slovak translation of the role name
 */
export const getRoleLabel = (role: string | null | undefined, isOwner: boolean = false): string => {
  if (isOwner || role?.toLowerCase() === 'owner') {
    return 'Majiteľ';
  }
  return getRoleDisplayName(role);
};

