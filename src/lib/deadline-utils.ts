export interface DeadlineStatus {
  type: 'overdue' | 'today' | 'tomorrow' | 'day2' | 'day3' | 'soon' | 'normal';
  text: string;
  color: string;
  showBadge: boolean;
  badgeColor?: string;
  badgeText?: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'none';
}

export const getDeadlineStatus = (dueDate: string | null): DeadlineStatus | null => {
  if (!dueDate) return null;
  
  const now = new Date();
  const deadline = new Date(dueDate);
  
  // Reset time to start of day for accurate day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  
  if (diffDays < 0) {
    return { 
      type: 'overdue', 
      text: `Prešiel o ${Math.abs(diffDays)} dní`, 
      color: 'text-foreground font-semibold', 
      showBadge: false,
      priority: 'critical'
    };
  } else if (diffDays === 0) {
    return { 
      type: 'today', 
      text: 'Dnes', 
      color: 'text-foreground font-bold', 
      showBadge: true, 
      badgeColor: 'bg-red-600 text-white', 
      badgeText: 'DNEŠNÝ DEADLINE!',
      priority: 'critical'
    };
  } else if (diffDays === 1) {
    return { 
      type: 'tomorrow', 
      text: 'Zajtra', 
      color: 'text-foreground font-semibold', 
      showBadge: true, 
      badgeColor: 'bg-orange-600 text-white', 
      badgeText: '1 DEŇ!',
      priority: 'high'
    };
  } else if (diffDays === 2) {
    return { 
      type: 'day2', 
      text: 'Pozajtra', 
      color: 'text-foreground font-medium', 
      showBadge: true, 
      badgeColor: 'bg-yellow-600 text-white', 
      badgeText: '2 DNI!',
      priority: 'high'
    };
  } else if (diffDays === 3) {
    return { 
      type: 'day3', 
      text: 'Za 3 dni', 
      color: 'text-muted-foreground', 
      showBadge: true, 
      badgeColor: 'bg-blue-600 text-white', 
      badgeText: '3 DNI!',
      priority: 'medium'
    };
  }
  
  return { 
    type: 'normal', 
    text: `Zostáva ${diffDays} dní`, 
    color: 'text-muted-foreground', 
    showBadge: false,
    priority: 'none'
  };
};

export const getDeadlineBadge = (deadlineStatus: DeadlineStatus | null) => {
  if (!deadlineStatus || !deadlineStatus.showBadge) return null;

  return {
    color: deadlineStatus.badgeColor || 'bg-muted',
    text: deadlineStatus.badgeText || '',
    icon: deadlineStatus.type === 'today' ? '🔥' : '⏰',
    animate: deadlineStatus.type === 'today'
  };
};

export const getDeadlineRowClass = (deadlineStatus: DeadlineStatus | null) => {
  // Remove all background highlighting
  return '';
};

export const getDeadlineDotClass = (deadlineStatus: DeadlineStatus | null) => {
  if (!deadlineStatus) return '';
  
  switch (deadlineStatus.priority) {
    case 'critical':
      return 'w-2 h-2 bg-red-500 rounded-full animate-pulse';
    case 'high':
      return 'w-2 h-2 bg-orange-500 rounded-full animate-pulse';
    case 'medium':
      return 'w-2 h-2 bg-yellow-500 rounded-full animate-pulse';
    case 'low':
      return 'w-2 h-2 bg-blue-500 rounded-full animate-pulse';
    default:
      return '';
  }
};
