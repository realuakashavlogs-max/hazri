import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsService } from '../services/studentsService';
import { useAuth } from '../contexts/AuthContext';

export function useStudents(classId?: string) {
  const { effectiveUserId, inspectedUser } = useAuth();
  const queryClient = useQueryClient();
  const isReadOnly = Boolean(inspectedUser);

  const query = useQuery({
    queryKey: ['students', effectiveUserId, classId],
    queryFn: () => studentsService.getStudents(effectiveUserId, classId),
    enabled: Boolean(effectiveUserId),
  });

  const createStudentMutation = useMutation({
    mutationFn: (data: {
      classId: string;
      name: string;
      rollNo?: string;
      parentName?: string;
      parentPhone?: string;
      notes?: string;
    }) => studentsService.createStudent({ userId: effectiveUserId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', effectiveUserId] });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data: { classId: string; rawText: string }) =>
      studentsService.bulkCreateStudents({ userId: effectiveUserId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', effectiveUserId] });
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
      queryClient.invalidateQueries({ queryKey: ['students', effectiveUserId] });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (id: string) => studentsService.deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', effectiveUserId] });
    },
  });

  return {
    students: query.data || [],
    isLoading: query.isLoading,
    isReadOnly,
    createStudent: createStudentMutation.mutateAsync,
    bulkCreateStudents: bulkCreateMutation.mutateAsync,
    updateStudent: updateStudentMutation.mutateAsync,
    deleteStudent: deleteStudentMutation.mutateAsync,
  };
}
