import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface Task {
  id: string;
  guidelineId: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  assigneeId?: string;
  dueDate?: string;
  entityType?: string;
  entityId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    displayName: string;
    email: string;
  };
}

interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginatedTasksResponse {
  data: Task[];
  meta: PaginatedMeta;
}

export function useTasks(guidelineId: string) {
  return useQuery({
    queryKey: ['tasks', guidelineId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedTasksResponse>(
        `/tasks?guidelineId=${guidelineId}&page=1&limit=100`,
      );
      return data;
    },
    enabled: !!guidelineId,
    select: (response) => response.data,
  });
}

interface CreateTaskVars {
  guidelineId: string;
  title: string;
  description?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  assigneeId?: string;
  dueDate?: string;
  entityType?: string;
  entityId?: string;
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: CreateTaskVars) =>
      apiClient.post<Task>('/tasks', vars).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', vars.guidelineId] });
    },
  });
}

interface UpdateTaskVars {
  id: string;
  guidelineId: string;
  title?: string;
  description?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  assigneeId?: string;
  dueDate?: string;
  entityType?: string;
  entityId?: string;
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, guidelineId: _guidelineId, ...body }: UpdateTaskVars) =>
      apiClient.put<Task>(`/tasks/${id}`, body).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', vars.guidelineId] });
    },
  });
}

interface DeleteTaskVars {
  id: string;
  guidelineId: string;
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: DeleteTaskVars) =>
      apiClient.delete(`/tasks/${id}`).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', vars.guidelineId] });
    },
  });
}
