import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../services/attendanceService';
import { useAuth } from '../contexts/AuthContext';

export function useAttendance(classId: string, date: string) {
  const { effectiveUserId, inspectedUser } = useAuth();
  const queryClient = useQueryClient();
  const isReadOnly = Boolean(inspectedUser);

  const query = useQuery({
    queryKey: ['attendance', effectiveUserId, classId, date],
    queryFn: () => attendanceService.getAttendanceForDate({ userId: effectiveUserId, classId, date }),
    enabled: Boolean(effectiveUserId && classId && date),
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: (records: {
      studentId: string;
      statusId: string;
      note?: string;
    }[]) =>
      attendanceService.saveAttendance(
        records.map((r) => ({
          userId: effectiveUserId,
          classId,
          attendanceDate: date,
          studentId: r.studentId,
          statusId: r.statusId,
          note: r.note,
        }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', effectiveUserId, classId, date] });
      queryClient.invalidateQueries({ queryKey: ['attendance_range', effectiveUserId, classId] });
      queryClient.invalidateQueries({ queryKey: ['user_attendance_date', effectiveUserId, date] });
    },
  });

  return {
    records: query.data || [],
    isLoading: query.isLoading,
    isReadOnly,
    saveAttendance: saveAttendanceMutation.mutateAsync,
  };
}

export function useUserAttendanceForDate(date: string) {
  const { effectiveUserId } = useAuth();

  const query = useQuery({
    queryKey: ['user_attendance_date', effectiveUserId, date],
    queryFn: () => attendanceService.getAttendanceForUserDate(effectiveUserId, date),
    enabled: Boolean(effectiveUserId && date),
  });

  return {
    records: query.data || [],
    isLoading: query.isLoading,
  };
}

export function useAttendanceRange(classId: string, startDate: string, endDate: string) {
  const { effectiveUserId } = useAuth();

  const query = useQuery({
    queryKey: ['attendance_range', effectiveUserId, classId, startDate, endDate],
    queryFn: () =>
      attendanceService.getAttendanceForRange({
        userId: effectiveUserId,
        classId,
        startDate,
        endDate,
      }),
    enabled: Boolean(effectiveUserId && classId && startDate && endDate),
  });

  return {
    records: query.data || [],
    isLoading: query.isLoading,
  };
}
