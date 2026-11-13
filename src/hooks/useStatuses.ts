import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { statusesService } from '../services/statusesService';
import { useAuth } from '../contexts/AuthContext';
import type { AttendanceStatus } from '../types/database';

export function useStatuses() {
  const { effectiveUserId, inspectedUser } = useAuth();
  const queryClient = useQueryClient();
  const isReadOnly = Boolean(inspectedUser);

  const query = useQuery({
    queryKey: ['statuses', effectiveUserId],
    queryFn: () => statusesService.getStatuses(effectiveUserId),
    enabled: Boolean(effectiveUserId),
  });

  const createStatusMutation = useMutation({
    mutationFn: (data: {
      labelEn: string;
      labelUr: string;
      color: string;
      countsAsPresent: boolean;
      notifyParents?: boolean;
    }) => statusesService.createStatus({ userId: effectiveUserId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses', effectiveUserId] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Parameters<typeof statusesService.updateStatus>[1];
    }) => statusesService.updateStatus(id, updates, effectiveUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses', effectiveUserId] });
    },
  });

  const reorderStatusesMutation = useMutation({
    mutationFn: (orderedStatuses: AttendanceStatus[]) =>
      statusesService.reorderStatuses(orderedStatuses, effectiveUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses', effectiveUserId] });
    },
  });

  const deleteStatusMutation = useMutation({
    mutationFn: (id: string) => statusesService.deleteStatus(id, effectiveUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses', effectiveUserId] });
    },
  });

  return {
    statuses: query.data || [],
    isLoading: query.isLoading,
    isReadOnly,
    createStatus: createStatusMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    reorderStatuses: reorderStatusesMutation.mutateAsync,
    deleteStatus: deleteStatusMutation.mutateAsync,
  };
}
