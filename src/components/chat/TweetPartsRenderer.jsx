"use client"

import { useState } from 'react';
import { TweetMockup } from "@/components/ui/tweet-mockup";
import { TweetToolbox } from "@/components/ui/tweet-toolbox";
import { StreamingMessage } from "@/components/ui/streaming-message";
import { toast } from "sonner";

/**
 * Component for rendering tweet-related message parts
 */
export function TweetPartsRenderer({ part, userInfo, isLastMessage, keyPrefix }) {
  const key = keyPrefix;

  // Handle tweet tool output parts (createTweet only - single tweets)
  if (part.type === 'data-tool-output' && part.data) {
    return renderSingleTweetOutput(part.data, userInfo, isLastMessage, key);
  }

  // Handle fetch-tweets-tool output parts
  if (part.type === 'data-fetch-tweets-tool' && part.data) {
    return renderMultipleTweetsOutput(part.data, userInfo, key);
  }

  return null;
}

function EditableTweetWrapper({ tweetData, userInfo, isLastMessage, children }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(tweetData.text || '');

  const handleEdit = () => {
    setEditedText(tweetData.text || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    tweetData.text = editedText;
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(tweetData.text || '');
    setIsEditing(false);
  };

  return children({
    isEditing,
    editedText,
    onTextChange: setEditedText,
    onEdit: handleEdit,
    onSave: handleSave,
    onCancel: handleCancel
  });
}

function renderSingleTweetOutput(tweetData, userInfo, isLastMessage, key) {
  // Handle error state
  if (tweetData.status === 'error') {
    return (
      <div key={key} className="mb-4">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">
            {tweetData.text || 'An error occurred.'}
          </p>
        </div>
      </div>
    );
  }

  // Handle processing state
  if (tweetData.status === 'processing') {
    return (
      <div key={key} className="mb-4">
        <TweetMockup
          index={tweetData.index || 0}
          isLoading={true}
          account={{
            name: userInfo?.name || 'Your Name',
            username: userInfo?.username || 'your_username',
            verified: false,
            avatar: userInfo?.profile_image_url
          }}
        />
      </div>
    );
  }

  // Handle streaming and complete states with single tweet content
  if (tweetData.text && (tweetData.status === 'streaming' || tweetData.status === 'complete')) {
    const isStreaming = tweetData.status === 'streaming' && isLastMessage;

    const experienceId = window.location.pathname?.split('/experiences/')[1]?.split('/')[0] || '';
    const [instruction, setInstruction] = useState('');
    const [media, setMedia] = useState([]);

    const onAIClick = async () => {
      const prompt = `Tweet: ${tweetData.text || ''}\n${instruction ? `Instructions: ${instruction}` : ''}`;
      try {
        const res = await fetch(`/api/experiences/${experienceId}/image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ string: prompt })
        });
        const urls = await res.json();
        if (res.ok && Array.isArray(urls)) {
          setMedia(urls);
        } else {
          console.error('Failed to generate images', urls);
        }
      } catch (e) {
        console.error('Error generating images', e);
      }
    };

    return (
      <EditableTweetWrapper tweetData={tweetData} userInfo={userInfo} isLastMessage={isLastMessage}>
        {({ isEditing, editedText, onTextChange, onEdit, onSave, onCancel }) => (
          <div key={key} className="mb-4">
            <TweetMockup
              index={tweetData.index || 0}
              text={isEditing ? editedText : tweetData.text.trim()}
              showPostButton={false}
              isEditing={isEditing}
              onTextChange={onTextChange}
              media={media}
              account={{
                name: userInfo?.name || 'Your Name',
                username: userInfo?.username || 'your_username',
                verified: false,
                avatar: userInfo?.profile_image_url
              }}
              onApply={(text) => {
                navigator.clipboard.writeText(text);
                toast.success('Tweet copied to clipboard!');
              }}
            >
              {isEditing ? (
                // During editing, only show the toolbox with save/cancel buttons
                <TweetToolbox
                  isEditing={isEditing}
                  onEdit={onEdit}
                  onSave={onSave}
                  onCancel={onCancel}
                  onPost={() => {
                    const text = tweetData.text?.trim?.() || '';
                    if (text) {
                      const encodedText = encodeURIComponent(text);
                      window.open(`https://x.com/compose/post?text=${encodedText}`, '_blank');
                    }
                  }}
                  value={instruction}
                  onChange={setInstruction}
                  onAIClick={onAIClick}
                />
              ) : (
                <div className="space-y-2">
                  <StreamingMessage
                    text={tweetData.text.trim()}
                    animate={isStreaming}
                    speed={110}
                  />
                  {/* separator matching text span */}
                  <div className="h-px bg-zinc-300 dark:bg-zinc-700 w-full max-w-full" />
                  <TweetToolbox
                    isEditing={isEditing}
                    onEdit={onEdit}
                    onSave={onSave}
                    onCancel={onCancel}
                    onPost={() => {
                      const text = tweetData.text?.trim?.() || '';
                      if (text) {
                        const encodedText = encodeURIComponent(text);
                        window.open(`https://x.com/compose/post?text=${encodedText}`, '_blank');
                      }
                    }}
                    value={instruction}
                    onChange={setInstruction}
                    onAIClick={onAIClick}
                  />
                </div>
              )}
            </TweetMockup>
          </div>
        )}
      </EditableTweetWrapper>
    );
  }

  // Fallback for data-tool-output parts without text content
  return (
    <div key={key} className="mb-4">
      <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
        Loading...
      </div>
    </div>
  );
}

function renderMultipleTweetsOutput(fetchData, userInfo, key) {
  // Handle error state
  if (fetchData.status === 'error') {
    return (
      <div key={key} className="mb-4">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">
            {fetchData.text || 'An error occurred while fetching tweets.'}
          </p>
        </div>
      </div>
    );
  }

  // Handle tweets array - side-scrollable display
  if (fetchData.tweets && Array.isArray(fetchData.tweets) && fetchData.tweets.length > 0) {
    const tweets = fetchData.tweets;

    return (
      <div key={key} className="mb-4">
        {/* Display individual tweet mockups as side-scrollable */}
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-max">
            {tweets.map((tweet, tweetIndex) => {
              return (
                <div key={`${key}-tweet-${tweetIndex}`} className="flex-shrink-0 w-80">
                  <TweetMockup
                    index={tweetIndex}
                    text={tweet.text}
                    isLineClampEnabled={true}
                    account={{
                      name: tweet.author.replace('@', ''),
                      username: tweet.author.replace('@', ''),
                      verified: false,
                      avatar: tweet.avatar || userInfo?.profile_image_url
                    }}
                    onApply={(text) => {
                      // Copy the full original text
                      navigator.clipboard.writeText(tweet.text);
                      toast.success('Tweet copied to clipboard!');
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
