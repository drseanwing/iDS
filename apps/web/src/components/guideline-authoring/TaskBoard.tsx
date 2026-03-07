import { useState } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Trash2, Plus } from 'lucide-react';
import { useTasks, useUpdateTask, useDeleteTask, Task } from '../../hooks/useTasks';
import { TaskCreateForm } from './TaskCreateForm';

interface TaskBoardProps {
  guidelineId: string;
}

type Status = 'TODO' | 'IN_PROGRESS' | 'DONE';

const STATUS_ORDER: Status[] = ['TODO', 'IN_PROGRESS', 'DONE'];

const COLUMN_CONFIG: Record<Status, { label: string; headerClass: string; emptyClass: string }> = {
  TODO: {
    label: 'TODO',
    headerClass: 'bg-gray-100 text-gray-700',
    emptyClass: 'text-gray-400',
  },
  IN_PROGRESS: {
    label: 'IN PROGRESS',
    headerClass: 'bg-blue-100 text-blue-700',
    emptyClass: 'text-blue-300',
  },
  DONE: {
    label: 'DONE',
    headerClass: 'bg-green-100 text-green-700',
    emptyClass: 'text-green-400',
  },
};

function getDueDateClass(dueDate: string): string {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return 'text-red-600 bg-red-50';
  if (diffDays <= 3) return 'text-yellow-700 bg-yellow-50';
  return 'text-gray-500 bg-gray-50';
}

function formatDueDate(dueDate: string): string {
  return new Date(dueDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface TaskCardProps {
  task: Task;
  guidelineId: string;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
}

function TaskCard({ task, guidelineId, onMoveLeft, onMoveRight }: TaskCardProps) {
  const deleteTask = useDeleteTask();

  const handleDelete = () => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    deleteTask.mutate({ id: task.id, guidelineId });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 leading-snug">{task.title}</p>
        <button
          onClick={handleDelete}
          disabled={deleteTask.isPending}
          title="Delete task"
          className="flex-shrink-0 rounded p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {task.assignee && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {task.assignee.displayName}
          </span>
        )}

        {task.dueDate && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getDueDateClass(task.dueDate)}`}
          >
            {formatDueDate(task.dueDate)}
          </span>
        )}
      </div>

      <div className="flex gap-1 pt-0.5">
        {onMoveLeft && (
          <button
            onClick={onMoveLeft}
            title="Move left"
            className="inline-flex items-center gap-0.5 rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-50"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
        )}
        {onMoveRight && (
          <button
            onClick={onMoveRight}
            title="Move right"
            className="inline-flex items-center gap-0.5 rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-50"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

interface ColumnProps {
  status: Status;
  tasks: Task[];
  guidelineId: string;
  onMove: (task: Task, targetStatus: Status) => void;
}

function Column({ status, tasks, guidelineId, onMove }: ColumnProps) {
  const config = COLUMN_CONFIG[status];
  const currentIndex = STATUS_ORDER.indexOf(status);
  const prevStatus = currentIndex > 0 ? STATUS_ORDER[currentIndex - 1] : null;
  const nextStatus = currentIndex < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIndex + 1] : null;

  return (
    <div className="flex flex-col flex-1 min-w-0 rounded-lg border border-gray-200 bg-gray-50">
      <div className={`rounded-t-lg px-3 py-2 ${config.headerClass}`}>
        <span className="text-xs font-bold tracking-wide">{config.label}</span>
        <span className="ml-2 text-xs opacity-70">{tasks.length}</span>
      </div>

      <div className="flex flex-col gap-2 p-2 flex-1">
        {tasks.length === 0 && (
          <p className={`text-xs text-center py-4 ${config.emptyClass}`}>No tasks</p>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            guidelineId={guidelineId}
            onMoveLeft={prevStatus ? () => onMove(task, prevStatus) : undefined}
            onMoveRight={nextStatus ? () => onMove(task, nextStatus) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export function TaskBoard({ guidelineId }: TaskBoardProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data: tasks, isLoading } = useTasks(guidelineId);
  const updateTask = useUpdateTask();

  const allTasks = tasks ?? [];

  const tasksByStatus = (status: Status) => allTasks.filter((t) => t.status === status);

  const handleMove = (task: Task, targetStatus: Status) => {
    updateTask.mutate({ id: task.id, guidelineId, status: targetStatus });
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Task
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <TaskCreateForm guidelineId={guidelineId} onClose={() => setShowCreateForm(false)} />
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {/* Board */}
      {!isLoading && (
        <div className="flex gap-3 items-start">
          {STATUS_ORDER.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={tasksByStatus(status)}
              guidelineId={guidelineId}
              onMove={handleMove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
