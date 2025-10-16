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
      color: 'text-red-600', 
      showBadge: false,
      priority: 'critical'
    };
  } else if (diffDays === 0) {
    return { 
      type: 'today', 
      text: 'Dnes', 
      color: 'text-red-600', 
      showBadge: true, 
      badgeColor: 'bg-red-500', 
      badgeText: 'DNEŠNÝ DEADLINE!',
      priority: 'critical'
    };
  } else if (diffDays === 1) {
    return { 
      type: 'tomorrow', 
      text: 'Zajtra', 
      color: 'text-orange-600', 
      showBadge: true, 
      badgeColor: 'bg-orange-500', 
      badgeText: '1 DEŇ!',
      priority: 'high'
    };
  } else if (diffDays === 2) {
    return { 
      type: 'day2', 
      text: 'Pozajtra', 
      color: 'text-yellow-600', 
      showBadge: true, 
      badgeColor: 'bg-yellow-500', 
      badgeText: '2 DNI!',
      priority: 'high'
    };
  } else if (diffDays === 3) {
    return { 
      type: 'day3', 
      text: 'Za 3 dni', 
      color: 'text-blue-600', 
      showBadge: true, 
      badgeColor: 'bg-blue-500', 
      badgeText: '3 DNI!',
      priority: 'medium'
    };
  }
  
  return { 
    type: 'normal', 
    text: `Zostáva ${diffDays} dní`, 
    color: 'text-gray-600', 
    showBadge: false,
    priority: 'none'
  };
};

export const getDeadlineBadge = (deadlineStatus: DeadlineStatus | null) => {
  if (!deadlineStatus || !deadlineStatus.showBadge) return null;

  return {
    color: deadlineStatus.badgeColor || 'bg-gray-500',
    text: deadlineStatus.badgeText || '',
    icon: deadlineStatus.type === 'today' ? '🔥' : '⏰',
    animate: deadlineStatus.type === 'today'
  };
};

export const getDeadlineRowClass = (deadlineStatus: DeadlineStatus | null) => {
  if (!deadlineStatus) return '';
  
  switch (deadlineStatus.priority) {
    case 'critical':
      return 'bg-red-50 border-l-4 border-l-red-400';
    case 'high':
      return 'bg-orange-50 border-l-4 border-l-orange-400';
    case 'medium':
      return 'bg-yellow-50 border-l-4 border-l-yellow-400';
    case 'low':
      return 'bg-blue-50 border-l-4 border-l-blue-400';
    default:
      return '';
  }
};
