import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classesService } from '../services/classesService';
import { useAuth } from '../contexts/AuthContext';

export function useClasses() {
  const { user } = useAuth();
  const userId = user?.id || '';
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['classes', userId],
    queryFn: () => classesService.getClasses(userId),
    enabled: Boolean(userId),
  });

  const createClassMutation = useMutation({
    mutationFn: (data: { name: string }) => classesService.createClass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', userId] });
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { name: string } }) =>
      classesService.updateClass(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', userId] });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: (id: string) => classesService.deleteClass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', userId] });
      queryClient.invalidateQueries({ queryKey: ['students', userId] });
    },
  });

  return {
    classes: query.data || [],
    isLoading: query.isLoading,
    createClass: createClassMutation.mutateAsync,
    updateClass: updateClassMutation.mutateAsync,
    deleteClass: deleteClassMutation.mutateAsync,
  };
}
