import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Avatar, AvatarImage } from '../ui/avatar'
import { cn } from '@/lib/utils'
import { useSelectedUser } from '../store/useSelectedUser'
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getMessages, deleteMessageAction, editMessageAction } from '@/actions/message.actions'
import MessageSkeleton from '../skeletons/MessageSkeleton'
import { DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { MoreVertical } from "lucide-react"
import { pusherClient } from '@/lib/pusher'

const MessageList = () => {
  const { selectedUser } = useSelectedUser();
  const { user: currentUser, isLoading: isUserLoading } = useKindeBrowserClient();
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");

  const { data: messages, isLoading: isMessagesLoading } = useQuery({
    queryKey: ["messages", selectedUser?.id],
    queryFn: async () => {
      if (selectedUser && currentUser) {
        const msgs = await getMessages(selectedUser.id, currentUser.id);
        return msgs.map((msg) => ({ ...msg, id: String(msg.id) }));
      }
      return [];
    },
    enabled: !!selectedUser && !!currentUser && !isUserLoading,
  });

  // Scroll do dna
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Delete poruke
  const handleDelete = async (messageId: string) => {
    if (!selectedUser?.id) return;
    await deleteMessageAction(messageId, selectedUser.id);
    setOpenMenuId(null);
  };

  // Edit poruke
  const handleEditSave = async (messageId: string) => {
    if (!selectedUser?.id || !editingContent.trim()) return;

    await editMessageAction(messageId, selectedUser.id, editingContent);

    // Update lokalni cache
    queryClient.setQueryData(["messages", selectedUser.id], (old: any) =>
      old.map((msg: any) =>
        msg.id === messageId ? { ...msg, content: editingContent } : msg
      )
    );

    setEditingMessageId(null);
    setEditingContent("");
    setOpenMenuId(null);
  };

  // Pusher events
  useEffect(() => {
    if (!selectedUser || !currentUser) return;
    const channelName = [selectedUser.id, currentUser.id].sort().join("__");
    const channel = pusherClient.subscribe(channelName);

    // Delete
    channel.bind("messageDeleted", (data: { messageId: string }) => {
      queryClient.setQueryData(["messages", selectedUser.id], (old: any) => {
        if (!old) return [];
        return old.filter((msg: any) => msg.id !== data.messageId);
      });
    });

    // Edit
    channel.bind("messageEdited", (data: { messageId: string, content: string }) => {
      queryClient.setQueryData(["messages", selectedUser.id], (old: any) => {
        return old.map((msg: any) =>
          msg.id === data.messageId ? { ...msg, content: data.content } : msg
        );
      });
    });

    return () => {
      channel.unbind("messageDeleted");
      channel.unbind("messageEdited");
      pusherClient.unsubscribe(channelName);
    };
  }, [selectedUser, currentUser, queryClient]);

  return (
    <div ref={messageContainerRef} className="w-full overflow-y-auto overflow-x-hidden h-full flex flex-col">
      <AnimatePresence>
        {!isMessagesLoading &&
          messages?.map((message, index) => {
            if (!message.content) return null;

            const isMenuOpen = openMenuId === message.id;
            const isEditing = editingMessageId === message.id;

            return (
              <motion.div
                key={`msg-${message.id || index}`}
                layout
                initial={{ opacity: 0, scale: 1, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1, y: 1 }}
                transition={{
                  opacity: { duration: 0.1 },
                  layout: { type: "spring", bounce: 0.3, duration: index * 0.05 + 0.2 },
                }}
                className={cn(
                  "flex flex-col gap-2 p-4 whitespace-pre-wrap",
                  message.senderId === currentUser?.id ? "items-end" : "items-start"
                )}
              >
                <div className="flex gap-3 items-center">
                  {message.senderId === selectedUser?.id && (
                    <Avatar>
                      <AvatarImage
                        src={selectedUser?.image || "/user-placeholder.png"}
                        alt="User Image"
                        className="border-2 border-white rounded-full"
                      />
                    </Avatar>
                  )}

                  <div className="relative flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          className="border p-2 rounded-md max-w-xs resize-none"
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            className="bg-green-500 text-white px-2 py-1 rounded"
                            onClick={() => handleEditSave(message.id)}
                          >
                            Save
                          </button>
                          <button
                            className="bg-gray-300 px-2 py-1 rounded"
                            onClick={() => { setEditingMessageId(null); setEditingContent(""); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : message.messageType === "text" ? (
                      <span className="bg-accent p-3 rounded-md max-w-xs">{message.content}</span>
                    ) : (
                      <img
                        src={message.content}
                        alt="Message Image"
                        className="border p-2 rounded h-40 md:h-52 object-cover"
                      />
                    )}

                    {message.senderId === currentUser?.id && !isEditing && (
                      <div className="relative">
                        <button
                          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                          onClick={() => setOpenMenuId(isMenuOpen ? null : message.id)}
                        >
                          <MoreVertical size={18} />
                        </button>

                        {isMenuOpen && (
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
								if (!message.id) return;
                                setEditingMessageId(message.id);
                                setEditingContent(message.content);
                                setOpenMenuId(null);
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
								if (!message.id) return;
								handleDelete(message.id)}}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        )}
                      </div>
                    )}
                  </div>

                  {message.senderId === currentUser?.id && (
                    <Avatar>
                      <AvatarImage
                        src={currentUser?.picture || "/user-placeholder.png"}
                        alt="User Image"
                        className="border-2 border-white rounded-full"
                      />
                    </Avatar>
                  )}
                </div>
              </motion.div>
            );
          })}

        {isMessagesLoading && (
          <>
            <MessageSkeleton />
            <MessageSkeleton />
            <MessageSkeleton />
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageList;
