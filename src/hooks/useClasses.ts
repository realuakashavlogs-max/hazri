import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classesService } from '../services/classesService';
import { useAuth } from '../contexts/AuthContext';

export function useClasses() {
  const { effectiveUserId, inspectedUser } = useAuth();
  const queryClient = useQueryClient();
  const isReadOnly = Boolean(inspectedUser);

  const query = useQuery({
    queryKey: ['classes', effectiveUserId],
    queryFn: () => classesService.getClasses(effectiveUserId),
    enabled: Boolean(effectiveUserId),
  });

  const createClassMutation = useMutation({
    mutationFn: (data: { name: string; section?: string }) =>
      classesService.createClass({ userId: effectiveUserId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', effectiveUserId] });
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Parameters<typeof classesService.updateClass>[1];
    }) => classesService.updateClass(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', effectiveUserId] });
    },
  });

  const archiveClassMutation = useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      classesService.setArchived(id, isArchived),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', effectiveUserId] });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: (id: string) => classesService.deleteClass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', effectiveUserId] });
      queryClient.invalidateQueries({ queryKey: ['students', effectiveUserId] });
    },
  });

  return {
    classes: query.data || [],
    isLoading: query.isLoading,
    isReadOnly,
    createClass: createClassMutation.mutateAsync,
    updateClass: updateClassMutation.mutateAsync,
    archiveClass: archiveClassMutation.mutateAsync,
    deleteClass: deleteClassMutation.mutateAsync,
  };
}
