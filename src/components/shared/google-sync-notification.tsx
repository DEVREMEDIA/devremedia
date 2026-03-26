'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  createFromGoogleEvent,
  ignoreGoogleEvent,
  acceptGoogleChange,
  rejectGoogleChange,
  confirmGoogleDelete,
  keepAfterGoogleDelete,
} from '@/lib/actions/google-sync';
import type { GoogleSyncActionData } from '@/types';

interface GoogleSyncNotificationProps {
  notificationId: string;
  actionData: GoogleSyncActionData;
  onAction?: () => void;
}

export function GoogleSyncNotification({
  notificationId,
  actionData,
  onAction,
}: GoogleSyncNotificationProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: () => Promise<{ error: string | null }>) => {
    setIsLoading(true);
    try {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Done');
        onAction?.();
      }
    } catch {
      toast.error('Action failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (actionData.action_type === 'google_new_event') {
    const { data } = actionData;
    return (
      <div className="flex flex-wrap gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[11px] px-2"
          disabled={isLoading}
          onClick={() => handleAction(() => createFromGoogleEvent(notificationId, 'custom', data))}
        >
          Create Event
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[11px] px-2 text-muted-foreground"
          disabled={isLoading}
          onClick={() =>
            handleAction(() => ignoreGoogleEvent(notificationId, data.google_event_id))
          }
        >
          Ignore
        </Button>
      </div>
    );
  }

  if (actionData.action_type === 'google_event_changed') {
    const { data } = actionData;
    return (
      <div className="flex flex-wrap gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[11px] px-2"
          disabled={isLoading}
          onClick={() => handleAction(() => acceptGoogleChange(notificationId, data))}
        >
          Accept
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[11px] px-2 text-muted-foreground"
          disabled={isLoading}
          onClick={() => handleAction(() => rejectGoogleChange(notificationId, data))}
        >
          Reject
        </Button>
      </div>
    );
  }

  if (actionData.action_type === 'google_event_deleted') {
    const { data } = actionData;
    return (
      <div className="flex flex-wrap gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          variant="destructive"
          className="h-6 text-[11px] px-2"
          disabled={isLoading}
          onClick={() => handleAction(() => confirmGoogleDelete(notificationId, data))}
        >
          Delete
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[11px] px-2 text-muted-foreground"
          disabled={isLoading}
          onClick={() =>
            handleAction(() => keepAfterGoogleDelete(notificationId, data.google_event_id))
          }
        >
          Keep
        </Button>
      </div>
    );
  }

  return null;
}
