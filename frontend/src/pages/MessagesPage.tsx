import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useMessagingStore } from '../store/messaging.store';
import { messagingService } from '../services/messaging.service';
import {
  connectMessagingSocket,
  disconnectMessagingSocket,
  getMessagingSocket,
  joinConversation,
  leaveConversation,
  emitReadReceipt,
  emitDelivered,
} from '../services/messaging-socket';
import { MsgConversation, MsgMessage, MsgDiscussion } from '../types/messaging.types';
import { ChatSidebar } from '../components/messaging/ChatSidebar';
import { DiscussionSidebar } from '../components/messaging/DiscussionSidebar';
import { MessageBubble } from '../components/messaging/MessageBubble';
import { MessageComposer } from '../components/messaging/MessageComposer';
import { TypingIndicator } from '../components/messaging/TypingIndicator';
import { PinnedMessages } from '../components/messaging/PinnedMessages';
import { OnlineStatus } from '../components/messaging/OnlineStatus';
import { MessageSearch } from '../components/messaging/MessageSearch';
import { DiscussionThread } from '../components/messaging/DiscussionThread';
import { DiscussionComposer } from '../components/messaging/DiscussionComposer';
import { AdminModerationPanel } from '../components/messaging/AdminModerationPanel';
import toast from 'react-hot-toast';

export const MessagesPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    activeTab,
    setActiveTab,
    activeConversation,
    setActiveConversation,
    messages,
    setMessages,
    addMessage,
    updateMessage,
    removeMessage,
    messagesLoading,
    setMessagesLoading,
    activeDiscussion,
    setActiveDiscussion,
    onlineUsers,
    setOnlineUsers,
    setUserOnline,
    setUserOffline,
    typingUsers,
    setTypingUser,
    removeTypingUser,
    clearUnread,
    incrementUnread,
    notifications,
    setNotifications,
    addNotification,
    unreadNotifCount,
  } = useMessagingStore();

  const [replyTo, setReplyTo] = useState<MsgMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<MsgMessage | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateDiscussion, setShowCreateDiscussion] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Connect socket on mount
  useEffect(() => {
    try {
      const socket = connectMessagingSocket();

      // Online status events
      socket.on('msg:online_users', (users: string[]) => setOnlineUsers(users));
      socket.on('msg:online_status', (data: { userId: string; isOnline: boolean }) => {
        if (data.isOnline) setUserOnline(data.userId);
        else setUserOffline(data.userId);
      });

      // Typing events
      socket.on('msg:typing', (data: { userId: string; userName: string; conversationId: string }) => {
        if (data.userId !== user?.id) {
          setTypingUser(data.conversationId, { userId: data.userId, userName: data.userName });
        }
      });
      socket.on('msg:stop_typing', (data: { userId: string; conversationId: string }) => {
        removeTypingUser(data.conversationId, data.userId);
      });

      // New message
      socket.on('msg:new_message', (msg: MsgMessage) => {
        if (msg.sender?._id !== user?.id) {
          addMessage(msg);
          // Mark as delivered
          emitDelivered([msg._id]);
        }
      });

      // Message edited
      socket.on('msg:edited', (msg: MsgMessage) => {
        updateMessage(msg._id, msg);
      });

      // Message deleted
      socket.on('msg:deleted', (data: { messageId: string }) => {
        removeMessage(data.messageId);
      });

      // Message pinned
      socket.on('msg:pinned', (msg: MsgMessage) => {
        updateMessage(msg._id, { isPinned: msg.isPinned, pinnedBy: msg.pinnedBy });
      });

      // Read receipt
      socket.on('msg:read_receipt', (data: { userId: string; messageIds: string[]; readAt: string }) => {
        data.messageIds.forEach((mid) => {
          updateMessage(mid, {
            readBy: [
              ...(messages.find((m) => m._id === mid)?.readBy || []),
              { user: data.userId, at: data.readAt },
            ],
          } as any);
        });
      });

      // Notifications
      socket.on('msg:notification', (notif: any) => {
        addNotification({ ...notif, _id: Date.now().toString(), isRead: false, createdAt: new Date().toISOString() } as any);
        // Try browser notification
        if (Notification.permission === 'granted') {
          new Notification(notif.title, { body: notif.body, icon: '/favicon.ico' });
        }
      });

      // Load notifications
      messagingService.getNotifications().then((res) => {
        setNotifications(res.data.data || []);
      });

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      return () => {
        disconnectMessagingSocket();
      };
    } catch (err) {
      console.error('Failed to connect messaging socket:', err);
    }
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation._id);
      joinConversation(activeConversation._id);
      clearUnread(activeConversation._id);

      return () => {
        leaveConversation(activeConversation._id);
      };
    }
  }, [activeConversation?._id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (activeConversation && messages.length > 0) {
      const unreadIds = messages
        .filter((m) => m.sender?._id !== user?.id && !m.readBy?.some((r) => r.user === user?.id))
        .map((m) => m._id);
      if (unreadIds.length > 0) {
        emitReadReceipt(activeConversation._id, unreadIds);
      }
    }
  }, [messages, activeConversation?._id]);

  const loadMessages = async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const res = await messagingService.getMessages(conversationId);
      setMessages(res.data.data || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSelectConversation = (conv: MsgConversation) => {
    setActiveConversation(conv);
    setActiveDiscussion(null);
    setShowCreateDiscussion(false);
    setReplyTo(null);
    setEditingMessage(null);
  };

  const handleSelectDiscussion = (disc: MsgDiscussion) => {
    setActiveDiscussion(disc);
    setActiveConversation(null);
    setShowCreateDiscussion(false);
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await messagingService.deleteMessage(msgId);
      removeMessage(msgId);
    } catch (err: any) {
      toast.error('Failed to delete');
    }
  };

  const handlePinMessage = async (msgId: string) => {
    try {
      const res = await messagingService.togglePinMessage(msgId);
      if (res.data.data) updateMessage(msgId, res.data.data);
    } catch (err: any) {
      toast.error('Failed to pin/unpin');
    }
  };

  const getOtherParticipant = (conv: MsgConversation) => {
    return conv.participants?.find((p) => p._id !== user?.id);
  };

  const pinnedMessages = messages.filter((m) => m.isPinned);
  const typingList = activeConversation
    ? (typingUsers.get(activeConversation._id) || []).map((t) => t.userName)
    : [];

  const showAdminTab = user?.role === 'admin';

  return (
    <div className="flex h-[calc(100vh-2rem)] rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Left sidebar */}
      <div className="w-[320px] flex-shrink-0 border-r border-white/5 flex flex-col" style={{ background: 'rgba(10,11,15,0.6)' }}>
        {/* Tab switcher */}
        <div className="flex border-b border-white/5">
          <button
            onClick={() => { setActiveTab('chats'); setShowCreateDiscussion(false); }}
            className={`flex-1 py-3 text-xs font-semibold text-center transition-all border-b-2 ${
              activeTab === 'chats'
                ? 'text-[#7c8fff] border-[#4f63ff]'
                : 'text-white/30 border-transparent hover:text-white/50'
            }`}
          >
            💬 Chats
          </button>
          <button
            onClick={() => { setActiveTab('discussions'); setShowCreateDiscussion(false); }}
            className={`flex-1 py-3 text-xs font-semibold text-center transition-all border-b-2 ${
              activeTab === 'discussions'
                ? 'text-[#7c8fff] border-[#4f63ff]'
                : 'text-white/30 border-transparent hover:text-white/50'
            }`}
          >
            💭 Discussions
          </button>
          {showAdminTab && (
            <button
              onClick={() => { setActiveTab('moderate'); setActiveConversation(null); setActiveDiscussion(null); }}
              className={`flex-1 py-3 text-xs font-semibold text-center transition-all border-b-2 ${
                activeTab === 'moderate'
                  ? 'text-[#7c8fff] border-[#4f63ff]'
                  : 'text-white/30 border-transparent hover:text-white/50'
              }`}
            >
              🛡️ Admin
            </button>
          )}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'moderate' ? (
            <div className="p-5 text-xs text-white/40 leading-relaxed font-mono">
              🛡️ Moderation Console
              <div className="mt-2 text-white/20">
                Authorized super administrators can audit logs, delete communications, or restrict user access.
              </div>
            </div>
          ) : activeTab === 'chats' ? (
            <ChatSidebar onSelectConversation={handleSelectConversation} />
          ) : (
            <DiscussionSidebar
              onSelectDiscussion={handleSelectDiscussion}
              onCreateNew={() => {
                setShowCreateDiscussion(true);
                setActiveConversation(null);
                setActiveDiscussion(null);
              }}
            />
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeTab === 'moderate' ? (
          <AdminModerationPanel />
        ) : (
          <>
            {/* No selection state */}
            {!activeConversation && !activeDiscussion && !showCreateDiscussion && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4 opacity-20">✉️</div>
              <h3 className="text-lg font-bold text-white/30 mb-1">Your Messages</h3>
              <p className="text-sm text-white/15">
                Select a conversation or start a new chat
              </p>
            </div>
          </div>
        )}

        {/* Create discussion */}
        {showCreateDiscussion && (
          <DiscussionComposer
            onCreated={() => {
              setShowCreateDiscussion(false);
              setActiveTab('discussions');
            }}
            onCancel={() => setShowCreateDiscussion(false)}
          />
        )}

        {/* Discussion thread */}
        {activeDiscussion && !showCreateDiscussion && (
          <DiscussionThread discussion={activeDiscussion} />
        )}

        {/* Private chat */}
        {activeConversation && !showCreateDiscussion && (
          <>
            {/* Chat header */}
            <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.015)' }}>
              {(() => {
                const other = getOtherParticipant(activeConversation);
                if (!other) return null;
                return (
                  <>
                    <div className="relative">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: 'linear-gradient(135deg, rgba(79,99,255,0.2), rgba(159,122,234,0.15))' }}>
                        {other.name?.[0]?.toUpperCase()}
                      </div>
                      <OnlineStatus
                        isOnline={onlineUsers.has(other._id)}
                        size="sm"
                        className="absolute -bottom-0.5 -right-0.5"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white/90">{other.name}</div>
                      <div className="text-[10px] text-white/30 capitalize">
                        {onlineUsers.has(other._id) ? (
                          <span className="text-green-400">Online</span>
                        ) : (
                          `${other.role} • ${other.department || 'N/A'}`
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSearch(true)}
                      className="w-8 h-8 rounded-lg bg-white/5 border border-white/[0.06] hover:bg-white/10 text-white/40 hover:text-white/70 flex items-center justify-center text-sm transition-all"
                      title="Search messages"
                    >
                      🔍
                    </button>
                  </>
                );
              })()}
            </div>

            {/* Pinned messages */}
            <PinnedMessages messages={pinnedMessages} />

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto py-3"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
            >
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full text-white/20 text-sm">
                  Loading messages…
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-4xl mb-2 opacity-20">👋</div>
                    <div className="text-sm text-white/20">No messages yet. Say hello!</div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg._id}
                      message={msg}
                      onReply={(m) => { setReplyTo(m); setEditingMessage(null); }}
                      onEdit={(m) => { setEditingMessage(m); setReplyTo(null); }}
                      onDelete={handleDeleteMessage}
                      onPin={handlePinMessage}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Typing indicator */}
            <TypingIndicator names={typingList} />

            {/* Composer */}
            <MessageComposer
              conversationId={activeConversation._id}
              replyTo={replyTo}
              editingMessage={editingMessage}
              onClearReply={() => setReplyTo(null)}
              onClearEdit={() => setEditingMessage(null)}
              onMessageSent={() => {
                loadMessages(activeConversation._id);
              }}
            />
          </>
        )}
          </>
        )}
      </div>

      {/* Search modal */}
      {showSearch && (
        <MessageSearch
          onClose={() => setShowSearch(false)}
          onMessageSelect={(convId) => {
            setShowSearch(false);
          }}
        />
      )}
    </div>
  );
};
