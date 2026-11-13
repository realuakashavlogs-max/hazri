import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsService } from '../services/studentsService';
import { useAuth } from '../contexts/AuthContext';

export function useStudents(classId?: string) {
  const { user } = useAuth();
  const userId = user?.id || '';
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['students', userId, classId],
    queryFn: () => studentsService.getStudents(userId, classId),
    enabled: Boolean(userId),
  });

  const createStudentMutation = useMutation({
    mutationFn: (data: {
      classId: string;
      name: string;
      rollNo?: string;
      parentPhone?: string;
    }) => studentsService.createStudent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', userId] });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data: { classId: string; rawText: string }) =>
      studentsService.bulkCreateStudents(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', userId] });
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Parameters<typeof studentsService.updateStudent>[1];
    }) => studentsService.updateStudent(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', userId] });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (id: string) => studentsService.deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', userId] });
    },
  });

  return {
    students: query.data || [],
    isLoading: query.isLoading,
    createStudent: createStudentMutation.mutateAsync,
    bulkCreateStudents: bulkCreateMutation.mutateAsync,
    updateStudent: updateStudentMutation.mutateAsync,
    deleteStudent: deleteStudentMutation.mutateAsync,
  };
}
