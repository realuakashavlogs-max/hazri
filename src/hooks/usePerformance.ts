import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceService } from '../services/performanceService';
import { useAuth } from '../contexts/AuthContext';
import type { StudentDailyPerformanceInput } from '../types/database';

export function usePerformanceRecordForDate(studentId: string, recordDate: string) {
  const { user } = useAuth();
  const userId = user?.id || '';

  const query = useQuery({
    queryKey: ['performance', 'record', userId, studentId, recordDate],
    queryFn: () =>
      performanceService.getPerformanceRecord({
        userId,
        studentId,
        recordDate,
      }),
    enabled: Boolean(userId && studentId && recordDate),
  });

  return {
    record: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useStudentPerformanceHistory(
  studentId: string,
  startDate?: string,
  endDate?: string
) {
  const { user } = useAuth();
  const userId = user?.id || '';

  const query = useQuery({
    queryKey: ['performance', 'student', userId, studentId, startDate, endDate],
    queryFn: () =>
      performanceService.getPerformanceForStudent({
        userId,
        studentId,
        startDate,
        endDate,
      }),
    enabled: Boolean(userId && studentId),
  });

  return {
    records: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useUserPerformanceForDate(recordDate: string) {
  const { user } = useAuth();
  const userId = user?.id || '';

  const query = useQuery({
    queryKey: ['performance', 'user_date', userId, recordDate],
    queryFn: () => performanceService.getPerformanceForUserDate(userId, recordDate),
    enabled: Boolean(userId && recordDate),
  });

  return {
    records: query.data || [],
    isLoading: query.isLoading,
  };
}

export function usePerformanceRange(params: {
  classId?: string;
  studentId?: string;
  startDate: string;
  endDate: string;
}) {
  const { user } = useAuth();
  const userId = user?.id || '';

  const query = useQuery({
    queryKey: [
      'performance',
      'range',
      userId,
      params.classId,
      params.studentId,
      params.startDate,
      params.endDate,
    ],
    queryFn: () =>
      performanceService.getPerformanceForRange({
        userId,
        classId: params.classId,
        studentId: params.studentId,
        startDate: params.startDate,
        endDate: params.endDate,
      }),
    enabled: Boolean(userId && params.startDate && params.endDate),
  });

  return {
    records: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useSavePerformance() {
  const { user } = useAuth();
  const userId = user?.id || '';
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (input: Omit<StudentDailyPerformanceInput, 'user_id'>) => {
      if (!userId) throw new Error('You must be signed in to save performance.');
      return performanceService.savePerformanceRecord({
        ...input,
        user_id: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance_range'] });
      queryClient.invalidateQueries({ queryKey: ['user_attendance_date'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!userId) throw new Error('You must be signed in.');
      return performanceService.deletePerformanceRecord(userId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance'] });
    },
  });

  return {
    savePerformance: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deletePerformance: deleteMutation.mutateAsync,
  };
}
