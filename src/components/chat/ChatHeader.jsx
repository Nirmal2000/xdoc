"use client"

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";

export function ChatHeader({ userInfo, authChecked, loading, login, logout, conversationTopic }) {
  const [handleInput, setHandleInput] = useState('');
  const [showLoginInput, setShowLoginInput] = useState(false);

  const handleShowLoginInput = () => {
    setShowLoginInput(true);
  };

  const handleLogin = async () => {
    if (!handleInput.trim()) {
      toast.error('Please enter a Twitter handle');
      return;
    }

    try {
      await login(handleInput.trim());
      setHandleInput('');
      setShowLoginInput(false);
      toast.success('Login successful!');
    } catch (error) {
      console.error('Login failed:', error);
      toast.error(error.message || 'Login failed');
    }
  };

  const handleCancelLogin = () => {
    setHandleInput('');
    setShowLoginInput(false);
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    } else if (e.key === 'Escape') {
      handleCancelLogin();
    }
  };

  return (
    <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      
      <div className="flex flex-row items-center gap-2">
        <img src="/logo.png" alt="X doc" className="h-8 w-auto" />
        {conversationTopic && (
          <div className="text-sm text-muted-foreground bg-accent px-2 py-1 rounded-md">
            {conversationTopic}
          </div>
        )}
      </div>
      
      <div className="ml-auto flex items-center gap-2">
        {!authChecked ? null : userInfo ? (
          <AuthenticatedUser 
            userInfo={userInfo} 
            onLogout={handleLogout} 
          />
        ) : (
          <UnauthenticatedUser
            showLoginInput={showLoginInput}
            handleInput={handleInput}
            loading={loading}
            onShowLoginInput={handleShowLoginInput}
            onInputChange={setHandleInput}
            onKeyDown={handleKeyDown}
            onLogin={handleLogin}
            onCancelLogin={handleCancelLogin}
          />
        )}
      </div>
    </header>
  );
}

function AuthenticatedUser({ userInfo, onLogout }) {
  return (
    <>
      {userInfo?.profile_image_url ? (
        <img
          src={userInfo.profile_image_url}
          alt={userInfo?.name || 'User'}
          className="h-8 w-8 rounded-full border"
        />
      ) : null}
      <div className="text-sm text-muted-foreground mr-2">
        {userInfo?.name} (@{userInfo?.username})
      </div>
      <Button variant="outline" className="rounded-full" onClick={onLogout}>
        Remove X
      </Button>
    </>
  );
}

function UnauthenticatedUser({
  showLoginInput,
  handleInput,
  loading,
  onShowLoginInput,
  onInputChange,
  onKeyDown,
  onLogin,
  onCancelLogin
}) {
  return (
    <div className="flex items-center gap-2">
      {showLoginInput ? (
        <LoginForm
          handleInput={handleInput}
          loading={loading}
          onInputChange={onInputChange}
          onKeyDown={onKeyDown}
          onLogin={onLogin}
          onCancelLogin={onCancelLogin}
        />
      ) : (
        <Button
          variant="outline"
          className="rounded-full"
          onClick={onShowLoginInput}
          disabled={loading}
        >
          Add your X
        </Button>
      )}
    </div>
  );
}

function LoginForm({
  handleInput,
  loading,
  onInputChange,
  onKeyDown,
  onLogin,
  onCancelLogin
}) {
  return (
    <>
      <div className="animate-in slide-in-from-right-2 duration-300">
        <input
          type="text"
          placeholder="Enter Twitter handle (e.g., elonmusk)"
          value={handleInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="px-4 py-2 text-sm bg-black text-white border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          disabled={loading}
          autoFocus
        />
      </div>
      <Button
        variant="outline"
        className="rounded-full"
        onClick={onLogin}
        disabled={loading || !handleInput.trim()}
      >
        {loading ? '...' : 'Login'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancelLogin}
        className="rounded-full h-8 w-8 p-0 text-gray-400 hover:text-white"
      >
        ×
      </Button>
    </>
  );
}