import { Loader2, Users } from 'lucide-react';
import { useSubscribers, useUnsubscribe } from '../../hooks/useSubscribers';

interface SubscribersPanelProps {
  guidelineId: string;
}

export function SubscribersPanel({ guidelineId }: SubscribersPanelProps) {
  const { data, isLoading, isError } = useSubscribers(guidelineId);
  const unsubscribe = useUnsubscribe();

  const subscribers = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const handleUnsubscribe = (id: string, email: string) => {
    if (!window.confirm(`Unsubscribe ${email}?`)) return;
    unsubscribe.mutate({ id, guidelineId });
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-gray-500" />
        <h2 className="text-lg font-semibold">Subscribers</h2>
        {!isLoading && !isError && data && (
          <span className="ml-auto text-sm text-gray-500">
            {total} {total === 1 ? 'subscriber' : 'subscribers'}
          </span>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load subscribers. Please try again.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && subscribers.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <Users className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No subscribers yet</p>
        </div>
      )}

      {/* Subscriber list */}
      {!isLoading && !isError && subscribers.length > 0 && (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {subscribers.map((subscriber) => (
            <div
              key={subscriber.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{subscriber.email}</p>
                <p className="text-xs text-gray-500">
                  {new Date(subscriber.subscribedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleUnsubscribe(subscriber.id, subscriber.email)}
                disabled={unsubscribe.isPending}
                className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 disabled:opacity-50 transition-colors"
              >
                Unsubscribe
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
