"use client"

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { PlusIcon, Search } from "lucide-react"
import { supabase } from '@/lib/supabase';

export default function ChatSidebar({ experienceId, userId, currentConversationId, onNewChat, onSelectConversation }) {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, [userId, experienceId]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('experience_id', experienceId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Expose loadConversations to parent
  useEffect(() => {
    if (window.loadConversations) {
      window.loadConversations = loadConversations;
    }
  }, []);

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-2 py-4">
        <div className="flex flex-row items-center gap-2 px-2">
          <img src="/logo.png" alt="X Doctor" className="h-8 w-auto" />
        </div>
        <Button variant="ghost" className="size-8">
          <Search className="size-4" />
        </Button>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <div className="px-4">
          <Button
            variant="outline"
            className="mb-4 flex w-full items-center gap-2"
            onClick={onNewChat}
          >
            <PlusIcon className="size-4" />
            <span>New Chat</span>
          </Button>
        </div>
        {isLoading ? (
          <div className="px-4">Loading conversations...</div>
        ) : conversations.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Recent Conversations</SidebarGroupLabel>
            <SidebarMenu>
              {conversations.map((conversation) => (
                <SidebarMenuButton
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={cn(
                    currentConversationId === conversation.id && "bg-accent"
                  )}
                >
                  <span>{conversation.title}</span>
                </SidebarMenuButton>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ) : (
          <div className="px-4 text-muted-foreground">No conversations yet</div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}