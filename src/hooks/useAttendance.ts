import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../services/attendanceService';
import { useAuth } from '../contexts/AuthContext';
import type { AttendanceStatusKey } from '../types/database';

export function useAttendance(classId: string, date: string) {
  const { user } = useAuth();
  const userId = user?.id || '';
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['attendance', userId, classId, date],
    queryFn: () => attendanceService.getAttendanceForDate({ userId, classId, date }),
    enabled: Boolean(userId && classId && date),
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: (records: {
      studentId: string;
      status: AttendanceStatusKey;
      note?: string;
    }[]) =>
      attendanceService.saveAttendance(
        userId,
        records.map((r) => ({
          classId,
          attendanceDate: date,
          studentId: r.studentId,
          status: r.status,
          note: r.note,
        }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', userId, classId, date] });
      queryClient.invalidateQueries({ queryKey: ['attendance_range', userId, classId] });
      queryClient.invalidateQueries({ queryKey: ['user_attendance_date', userId, date] });
    },
  });

  return {
    records: query.data || [],
    isLoading: query.isLoading,
    saveAttendance: saveAttendanceMutation.mutateAsync,
  };
}

export function useUserAttendanceForDate(date: string) {
  const { user } = useAuth();
  const userId = user?.id || '';

  const query = useQuery({
    queryKey: ['user_attendance_date', userId, date],
    queryFn: () => attendanceService.getAttendanceForUserDate(userId, date),
    enabled: Boolean(userId && date),
  });

  return {
    records: query.data || [],
    isLoading: query.isLoading,
  };
}

export function useAttendanceRange(classId: string, startDate: string, endDate: string) {
  const { user } = useAuth();
  const userId = user?.id || '';

  const query = useQuery({
    queryKey: ['attendance_range', userId, classId, startDate, endDate],
    queryFn: () =>
      attendanceService.getAttendanceForRange({
        userId,
        classId,
        startDate,
        endDate,
      }),
    enabled: Boolean(userId && classId && startDate && endDate),
  });

  return {
    records: query.data || [],
    isLoading: query.isLoading,
  };
}
