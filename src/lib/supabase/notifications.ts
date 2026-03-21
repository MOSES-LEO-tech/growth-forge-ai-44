// Notifications table doesn't exist yet in the database.
// Providing stub implementations that return empty data.

export const getNotifications = async (_userId: string) => {
  return {
    notifications: [] as any[],
    unreadCount: 0
  };
};

export const markNotificationRead = async (_id: string) => {
  // No-op until notifications table is created
};

export const markAllNotificationsRead = async (_userId: string) => {
  // No-op until notifications table is created
};
