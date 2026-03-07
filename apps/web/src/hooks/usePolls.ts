import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface PollVote {
  id: string;
  pollId: string;
  userId: string;
  value: unknown;
  comment?: string;
  createdAt: string;
}

export interface Poll {
  id: string;
  guidelineId: string;
  title: string;
  pollType: 'OPEN_TEXT' | 'MULTIPLE_CHOICE' | 'STRENGTH_VOTE' | 'ETD_JUDGMENT';
  options?: string;
  recommendationId?: string;
  isActive: boolean;
  createdAt: string;
  votes?: PollVote[];
}

interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginatedPollsResponse {
  data: Poll[];
  meta: PaginatedMeta;
}

export function usePolls(guidelineId: string) {
  return useQuery({
    queryKey: ['polls', guidelineId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedPollsResponse>(
        `/polls?guidelineId=${guidelineId}`,
      );
      return data;
    },
    enabled: !!guidelineId,
    select: (response) => response.data,
  });
}

interface CreatePollVars {
  guidelineId: string;
  title: string;
  pollType: Poll['pollType'];
  options?: string[];
  recommendationId?: string;
}

export function useCreatePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: CreatePollVars) =>
      apiClient.post<Poll>('/polls', vars).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['polls', vars.guidelineId] });
    },
  });
}

interface CastVoteVars {
  pollId: string;
  guidelineId: string;
  value: unknown;
  comment?: string;
}

export function useCastVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, guidelineId: _guidelineId, ...body }: CastVoteVars) =>
      apiClient.post(`/polls/${pollId}/vote`, body).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['polls', vars.guidelineId] });
    },
  });
}

interface ClosePollVars {
  pollId: string;
  guidelineId: string;
}

export function useClosePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId }: ClosePollVars) =>
      apiClient.put(`/polls/${pollId}/close`).then((r) => r.data),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['polls', vars.guidelineId] });
    },
  });
}
