import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface Permission {
  id: string;
  guidelineId: string;
  userId: string;
  role: 'ADMIN' | 'AUTHOR' | 'REVIEWER' | 'VIEWER';
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    displayName: string;
    email: string;
  };
}

export function usePermissions(guidelineId: string | null) {
  return useQuery({
    queryKey: ['permissions', guidelineId],
    queryFn: async () => {
      const { data } = await apiClient.get<Permission[]>(
        `/guidelines/${guidelineId}/permissions`,
      );
      return data;
    },
    enabled: !!guidelineId,
  });
}

interface AddPermissionVars {
  guidelineId: string;
  userId: string;
  role: 'ADMIN' | 'AUTHOR' | 'REVIEWER' | 'VIEWER';
}

export function useAddPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ guidelineId, userId, role }: AddPermissionVars) =>
      apiClient
        .post(`/guidelines/${guidelineId}/permissions`, { userId, role })
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['permissions', vars.guidelineId] });
    },
  });
}

interface RemovePermissionVars {
  guidelineId: string;
  userId: string;
}

export function useRemovePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ guidelineId, userId }: RemovePermissionVars) =>
      apiClient
        .delete(`/guidelines/${guidelineId}/permissions/${userId}`)
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['permissions', vars.guidelineId] });
    },
  });
}
