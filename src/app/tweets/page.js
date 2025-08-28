'use client';

import React from 'react';
import { TweetsDisplay } from '@/components/ui/tweets-display';

export default function TweetsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              X Tweets Manager
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect with X to view your tweets, mentions, timeline, and liked posts. 
              Manage your X content all in one place.
            </p>
          </div>
          
          <TweetsDisplay />
        </div>
      </div>
    </div>
  );
}