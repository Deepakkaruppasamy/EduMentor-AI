import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { useMessagingStore } from '../../store/messaging.store';
import { messagingService } from '../../services/messaging.service';
import { MsgConversation, MsgParticipant } from '../../types/messaging.types';
import { OnlineStatus } from './OnlineStatus';
import { format, isToday, isYesterday } from 'date-fns';

interface ChatSidebarProps {
  onSelectConversation: (conv: MsgConversation) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ onSelectConversation }) => {
  const { user } = useAuthStore();
  const { conversations, activeConversation, onlineUsers, unreadCounts, setConversations, setActiveConversation } = useMessagingStore();
  const [contactList, setContactList] = useState<MsgParticipant[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showContacts, setShowContacts] = useState(false);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, []);

  // Load contact list
  useEffect(() => {
    loadContacts();
  }, [user?.role]);

  const loadConversations = async () => {
    try {
      const res = await messagingService.getConversations();
      setConversations(res.data.data || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadContacts = async () => {
    try {
      if (user?.role === 'student') {
        const res = await messagingService.getFacultyList();
        setContactList(res.data.data || []);
      } else {
        const res = await messagingService.getStudentList();
        setContactList(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    }
  };

  const startChat = async (contactId: string) => {
    setLoading(true);
    try {
      const res = await messagingService.startConversation(contactId);
      const conv = res.data.data;
      if (conv) {
        onSelectConversation(conv);
        setShowContacts(false);
        loadConversations();
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  const getOtherParticipant = (conv: MsgConversation): MsgParticipant | undefined => {
    return conv.participants?.find((p) => p._id !== user?.id);
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, 'h:mm a');
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  };

  const filteredConversations = conversations.filter((c) => {
    if (!search) return true;
    const other = getOtherParticipant(c);
    return other?.name?.toLowerCase().includes(search.toLowerCase());
  });

  const filteredContacts = contactList.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white/90">
            {showContacts ? 'New Chat' : 'Messages'}
          </h3>
          <button
            onClick={() => setShowContacts(!showContacts)}
            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all text-xs"
            title={showContacts ? 'Back to chats' : 'New conversation'}
          >
            {showContacts ? '←' : '✏️'}
          </button>
        </div>

        <input
          type="text"
          placeholder={showContacts ? 'Search contacts…' : 'Search chats…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/[0.08] text-white/80 outline-none focus:border-[#4f5dc8]/35 placeholder:text-white/20"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {showContacts ? (
          // Contact list for new chat
          <>
            {filteredContacts.length === 0 && (
              <div className="p-6 text-center text-white/25 text-xs">No contacts found</div>
            )}
            {filteredContacts.map((contact) => (
              <button
                key={contact._id}
                onClick={() => startChat(contact._id)}
                disabled={loading}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg, rgba(79,93,200,0.14), rgba(124,111,194,0.15))' }}>
                    {contact.name?.[0]?.toUpperCase()}
                  </div>
                  <OnlineStatus
                    isOnline={onlineUsers.has(contact._id)}
                    size="sm"
                    className="absolute -bottom-0.5 -right-0.5"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-white/80 truncate">{contact.name}</div>
                  <div className="text-[10px] text-white/30 truncate capitalize">{contact.role} • {contact.department || 'N/A'}</div>
                </div>
              </button>
            ))}
          </>
        ) : (
          // Conversation list
          <>
            {filteredConversations.length === 0 && (
              <div className="p-6 text-center text-xs">
                <div className="text-2xl mb-2">💬</div>
                <div className="text-white/25">No conversations yet</div>
                <button
                  onClick={() => setShowContacts(true)}
                  className="mt-2 text-[#8b94e0] hover:underline text-[10px]"
                >
                  Start a new chat →
                </button>
              </div>
            )}
            {filteredConversations.map((conv) => {
              const other = getOtherParticipant(conv);
              if (!other) return null;
              const isActive = activeConversation?._id === conv._id;
              const unread = conv.unreadCount || unreadCounts.get(conv._id) || 0;

              return (
                <button
                  key={conv._id}
                  onClick={() => onSelectConversation(conv)}
                  className={`w-full px-4 py-3 flex items-center gap-3 transition-all text-left border-l-2 ${
                    isActive
                      ? 'bg-[#4f5dc8]/10 border-l-[#4f5dc8]'
                      : 'border-l-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: 'linear-gradient(135deg, rgba(79,93,200,0.14), rgba(124,111,194,0.15))' }}>
                      {other.name?.[0]?.toUpperCase()}
                    </div>
                    <OnlineStatus
                      isOnline={onlineUsers.has(other._id)}
                      size="sm"
                      className="absolute -bottom-0.5 -right-0.5"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold truncate ${unread > 0 ? 'text-white' : 'text-white/80'}`}>
                        {other.name}
                      </span>
                      <span className="text-[10px] text-white/25 flex-shrink-0 ml-2">
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className={`text-[11px] truncate ${unread > 0 ? 'text-white/60' : 'text-white/30'}`}>
                        {conv.lastMessage
                          ? conv.lastMessage.messageType !== 'text'
                            ? `[${conv.lastMessage.messageType}]`
                            : conv.lastMessage.content?.substring(0, 40)
                          : 'No messages yet'}
                      </span>
                      {unread > 0 && (
                        <span className="flex-shrink-0 ml-2 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #4f5dc8, #6359a8)' }}>
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};
