// Messages table doesn't exist yet. Stub implementations.
export const getMessages = async (_userId: string) => {
  return [];
};

export const sendMessage = async (_senderId: string, _receiverId: string, _content: string, _subject?: string) => {
  return {};
};

export const markMessageRead = async (_id: string) => {};
