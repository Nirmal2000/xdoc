"use client"

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { PlusIcon, Trash2 } from "lucide-react"
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";
import { CircularLoader } from "@/components/ui/loader";

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

  const handleDeleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    
    // Store original conversation data for rollback
    const conversationToDelete = conversations.find(c => c.id === conversationId);
    const originalIndex = conversations.findIndex(c => c.id === conversationId);
    
    if (!conversationToDelete) return;
    
    // Optimistic update - remove immediately from UI
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    
    // If deleted conversation was current, reset UI
    let wasCurrentConversation = false;
    if (conversationId === currentConversationId && onSelectConversation) {
      wasCurrentConversation = true;
      onSelectConversation(null);
    }
    
    try {
      const response = await fetch(`/api/experiences/${experienceId}/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
      
      // Rollback - restore conversation to original position
      setConversations(prev => {
        const restored = [...prev];
        restored.splice(originalIndex, 0, conversationToDelete);
        return restored;
      });
      
      // Restore current conversation if it was the deleted one
      if (wasCurrentConversation && onSelectConversation) {
        onSelectConversation(conversationId);
      }
    }
  };

  // Expose functions to parent
  useEffect(() => {
    window.loadConversations = loadConversations;
    
    window.addTempConversation = (tempConversation) => {
      setConversations(prev => [tempConversation, ...prev]);
    };
    
    window.replaceTempConversation = (tempId, realConversation) => {
      setConversations(prev => prev.map(c => 
        c.id === tempId ? realConversation : c
      ));
    };
    
    window.removeTempConversation = (tempId) => {
      setConversations(prev => prev.filter(c => c.id !== tempId));
    };
  }, []);

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas">
      <SidebarHeader className="flex flex-row items-center gap-2 px-2 py-4">
        <div className="flex flex-row items-center gap-2 px-2">
          <img src="/logo.png" alt="X Doctor" className="h-8 w-auto" />
        </div>
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
                <SidebarMenuItem key={conversation.id} className="relative">
                  <SidebarMenuButton
                    onClick={() => {
                      if (conversation.status === 'creating') return;
                      if (conversation.id === currentConversationId) return; // ignore click on selected convo
                      onSelectConversation && onSelectConversation(conversation.id);
                    }}
                    className={cn(
                      "w-full pr-10",
                      currentConversationId === conversation.id && "bg-accent",
                      conversation.status === 'creating' && "opacity-50 cursor-wait"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {conversation.status === 'creating' && (
                        <CircularLoader size="sm" className="text-current" />
                      )}
                      {conversation.title}
                    </span>
                  </SidebarMenuButton>
                  {conversation.status !== 'creating' && (
                    <SidebarMenuAction
                      showOnHover
                      aria-label="Delete conversation"
                      className="text-red-500 hover:text-red-500"
                      onClick={(e) => handleDeleteConversation(conversation.id, e)}
                    >
                      <Trash2 className="size-3" />
                    </SidebarMenuAction>
                  )}
                </SidebarMenuItem>
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
