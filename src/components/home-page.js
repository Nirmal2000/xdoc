import ChatUI from './chat-ui';

export default function HomePage({ experienceId, userAuth }) {
  if (!userAuth.isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground">Please authenticate to access the chat.</p>
        </div>
      </div>
    );
  }

  return <ChatUI experienceId={experienceId} userId={userAuth.userId} />;
}