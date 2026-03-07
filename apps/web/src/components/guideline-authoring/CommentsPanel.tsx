import { useState } from 'react';
import { Loader2, Trash2, CornerDownRight } from 'lucide-react';
import {
  useComments,
  useCreateComment,
  useUpdateCommentStatus,
  useDeleteComment,
  type Comment,
} from '../../hooks/useComments';

interface CommentsPanelProps {
  recommendationId: string;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const statusBadge: Record<Comment['status'], string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-gray-100 text-gray-700',
};

interface CommentItemProps {
  comment: Comment;
  recommendationId: string;
  depth?: number;
}

function CommentItem({ comment, recommendationId, depth = 0 }: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const createComment = useCreateComment();
  const updateStatus = useUpdateCommentStatus();
  const deleteComment = useDeleteComment();

  const handleReply = () => {
    if (!replyContent.trim()) return;
    createComment.mutate(
      { recommendationId, content: replyContent.trim(), parentId: comment.id },
      {
        onSuccess: () => {
          setReplyContent('');
          setShowReplyForm(false);
        },
      },
    );
  };

  const handleResolve = () => {
    updateStatus.mutate({ id: comment.id, status: 'RESOLVED', recommendationId });
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteComment.mutate({ id: comment.id, recommendationId });
  };

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}>
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
        {/* Header row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900">
            {comment.user.displayName}
          </span>
          <span className="text-xs text-gray-500">{relativeTime(comment.createdAt)}</span>
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[comment.status]}`}
          >
            {comment.status}
          </span>
        </div>

        {/* Content */}
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          {depth === 0 && (
            <button
              onClick={() => setShowReplyForm((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <CornerDownRight className="h-3.5 w-3.5" />
              Reply
            </button>
          )}
          {comment.status !== 'RESOLVED' && (
            <button
              onClick={handleResolve}
              disabled={updateStatus.isPending}
              className="text-xs text-green-600 hover:text-green-800 disabled:opacity-50"
            >
              Resolve
            </button>
          )}
          {confirmDelete ? (
            <span className="flex items-center gap-2 text-xs">
              <span className="text-gray-600">Confirm?</span>
              <button
                onClick={handleDelete}
                disabled={deleteComment.isPending}
                className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={handleDelete}
              className="ml-auto inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Inline reply form */}
      {showReplyForm && (
        <div className="mt-2 ml-6 border-l-2 border-gray-200 pl-4 space-y-2">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReply}
              disabled={!replyContent.trim() || createComment.isPending}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createComment.isPending ? 'Submitting...' : 'Submit'}
            </button>
            <button
              onClick={() => {
                setShowReplyForm(false);
                setReplyContent('');
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              recommendationId={recommendationId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentsPanel({ recommendationId }: CommentsPanelProps) {
  const [newContent, setNewContent] = useState('');
  const { data, isLoading } = useComments(recommendationId);
  const createComment = useCreateComment();

  const comments = data?.comments ?? [];

  const handlePost = () => {
    if (!newContent.trim()) return;
    createComment.mutate(
      { recommendationId, content: newContent.trim() },
      { onSuccess: () => setNewContent('') },
    );
  };

  return (
    <div className="overflow-y-auto p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Comments</h2>
        {!isLoading && (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-700">
            {comments.length}
          </span>
        )}
      </div>

      {/* New comment input */}
      <div className="space-y-2">
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex justify-end">
          <button
            onClick={handlePost}
            disabled={!newContent.trim() || createComment.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createComment.isPending ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && comments.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-gray-500">No comments yet.</p>
        </div>
      )}

      {/* Comment list */}
      {!isLoading && comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              recommendationId={recommendationId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
