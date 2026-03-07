import { useState } from 'react';
import { Loader2, Plus, Vote } from 'lucide-react';
import { usePolls, useCreatePoll, useCastVote, useClosePoll, Poll } from '../../hooks/usePolls';

interface PollsPanelProps {
  guidelineId: string;
}

const POLL_TYPE_LABELS: Record<Poll['pollType'], string> = {
  OPEN_TEXT: 'Open Text',
  MULTIPLE_CHOICE: 'Multiple Choice',
  STRENGTH_VOTE: 'Strength Vote',
  ETD_JUDGMENT: 'EtD Judgment',
};

const POLL_TYPE_COLORS: Record<Poll['pollType'], string> = {
  OPEN_TEXT: 'bg-purple-100 text-purple-700',
  MULTIPLE_CHOICE: 'bg-blue-100 text-blue-700',
  STRENGTH_VOTE: 'bg-amber-100 text-amber-700',
  ETD_JUDGMENT: 'bg-teal-100 text-teal-700',
};

const STRENGTH_OPTIONS = [
  'STRONG_FOR',
  'CONDITIONAL_FOR',
  'CONDITIONAL_AGAINST',
  'STRONG_AGAINST',
] as const;

const STRENGTH_LABELS: Record<string, string> = {
  STRONG_FOR: 'Strong For',
  CONDITIONAL_FOR: 'Conditional For',
  CONDITIONAL_AGAINST: 'Conditional Against',
  STRONG_AGAINST: 'Strong Against',
};

function CreatePollForm({
  guidelineId,
  onClose,
}: {
  guidelineId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [pollType, setPollType] = useState<Poll['pollType']>('OPEN_TEXT');
  const createPoll = useCreatePoll();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createPoll.mutate(
      { guidelineId, title: title.trim(), pollType },
      { onSuccess: onClose },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Poll title..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Poll Type</label>
        <select
          value={pollType}
          onChange={(e) => setPollType(e.target.value as Poll['pollType'])}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="OPEN_TEXT">Open Text</option>
          <option value="MULTIPLE_CHOICE">Multiple Choice</option>
          <option value="STRENGTH_VOTE">Strength Vote</option>
          <option value="ETD_JUDGMENT">EtD Judgment</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createPoll.isPending || !title.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {createPoll.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Create
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function VotingInterface({
  poll,
  guidelineId,
}: {
  poll: Poll;
  guidelineId: string;
}) {
  const [value, setValue] = useState('');
  const [comment, setComment] = useState('');
  const castVote = useCastVote();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    let parsedValue: unknown = value;
    if (poll.pollType === 'MULTIPLE_CHOICE') {
      parsedValue = parseInt(value, 10);
    }

    castVote.mutate(
      {
        pollId: poll.id,
        guidelineId,
        value: parsedValue,
        comment: comment.trim() || undefined,
      },
      {
        onSuccess: () => {
          setValue('');
          setComment('');
        },
      },
    );
  };

  const parsedOptions: string[] = poll.options ? (() => {
    try {
      return JSON.parse(poll.options);
    } catch {
      return [];
    }
  })() : [];

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t border-gray-100 pt-3">
      {poll.pollType === 'OPEN_TEXT' && (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your response..."
          rows={2}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      )}

      {poll.pollType === 'MULTIPLE_CHOICE' && (
        <div className="space-y-1.5">
          {parsedOptions.map((option, idx) => (
            <label key={idx} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name={`poll-${poll.id}`}
                value={String(idx)}
                checked={value === String(idx)}
                onChange={(e) => setValue(e.target.value)}
                className="text-blue-600"
              />
              {option}
            </label>
          ))}
        </div>
      )}

      {poll.pollType === 'STRENGTH_VOTE' && (
        <div className="space-y-1.5">
          {STRENGTH_OPTIONS.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name={`poll-${poll.id}`}
                value={opt}
                checked={value === opt}
                onChange={(e) => setValue(e.target.value)}
                className="text-blue-600"
              />
              {STRENGTH_LABELS[opt]}
            </label>
          ))}
        </div>
      )}

      {poll.pollType === 'ETD_JUDGMENT' && (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your judgment..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      )}

      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment..."
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      <button
        type="submit"
        disabled={castVote.isPending || !value.trim()}
        className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {castVote.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Submit Vote
      </button>
    </form>
  );
}

function PollCard({
  poll,
  guidelineId,
}: {
  poll: Poll;
  guidelineId: string;
}) {
  const closePoll = useClosePoll();
  const voteCount = poll.votes?.length ?? 0;

  const handleClose = () => {
    if (!window.confirm(`Close poll "${poll.title}"? No more votes will be accepted.`)) return;
    closePoll.mutate({ pollId: poll.id, guidelineId });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-900">{poll.title}</h3>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${POLL_TYPE_COLORS[poll.pollType]}`}>
            {POLL_TYPE_LABELS[poll.pollType]}
          </span>
          {poll.isActive ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              Closed
            </span>
          )}
        </div>
        {poll.isActive && (
          <button
            onClick={handleClose}
            disabled={closePoll.isPending}
            title="Close poll"
            className="flex-shrink-0 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {closePoll.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              'Close Poll'
            )}
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500">
        {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
      </p>

      {poll.isActive && (
        <VotingInterface poll={poll} guidelineId={guidelineId} />
      )}
    </div>
  );
}

export function PollsPanel({ guidelineId }: PollsPanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data: polls, isLoading } = usePolls(guidelineId);

  const allPolls = polls ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Vote className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Polls &amp; Voting</h2>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create Poll
        </button>
      </div>

      {showCreateForm && (
        <CreatePollForm guidelineId={guidelineId} onClose={() => setShowCreateForm(false)} />
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {!isLoading && allPolls.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <Vote className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No polls yet</p>
          <p className="text-xs text-gray-400">Create a poll to gather panel input</p>
        </div>
      )}

      {!isLoading && allPolls.length > 0 && (
        <div className="space-y-3">
          {allPolls.map((poll) => (
            <PollCard key={poll.id} poll={poll} guidelineId={guidelineId} />
          ))}
        </div>
      )}
    </div>
  );
}
