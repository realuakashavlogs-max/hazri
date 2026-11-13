import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/adminService';
import { useAuth } from '../contexts/AuthContext';

export function useAdminUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const query = useQuery({
    queryKey: ['admin_users'],
    queryFn: () => adminService.getAllUsers(),
    enabled: isAdmin,
  });

  const blockMutation = useMutation({
    mutationFn: ({ userId, isBlocked }: { userId: string; isBlocked: boolean }) =>
      adminService.setUserBlocked(userId, isBlocked),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
      queryClient.invalidateQueries({ queryKey: ['admin_stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin_user_detail', vars.userId] });
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'user' | 'admin' }) =>
      adminService.setUserRole(userId, role),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
      queryClient.invalidateQueries({ queryKey: ['admin_user_detail', vars.userId] });
    },
  });

  return {
    users: query.data || [],
    isLoading: query.isLoading,
    isAdmin,
    setUserBlocked: blockMutation.mutateAsync,
    setUserRole: roleMutation.mutateAsync,
  };
}

export function useAdminStats() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return useQuery({
    queryKey: ['admin_stats'],
    queryFn: () => adminService.getAdminStats(),
    enabled: isAdmin,
  });
}

export function useAdminUserDetail(userId: string) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const profileQuery = useQuery({
    queryKey: ['admin_user_detail', userId],
    queryFn: () => adminService.getUserById(userId),
    enabled: isAdmin && Boolean(userId),
  });

  const classesQuery = useQuery({
    queryKey: ['admin_user_classes', userId],
    queryFn: () => adminService.getUserClasses(userId),
    enabled: isAdmin && Boolean(userId),
  });

  const studentsQuery = useQuery({
    queryKey: ['admin_user_students', userId],
    queryFn: () => adminService.getUserStudents(userId),
    enabled: isAdmin && Boolean(userId),
  });

  const attendanceQuery = useQuery({
    queryKey: ['admin_user_attendance', userId],
    queryFn: () => adminService.getUserAttendance(userId),
    enabled: isAdmin && Boolean(userId),
  });

  const statusesQuery = useQuery({
    queryKey: ['admin_user_statuses', userId],
    queryFn: () => adminService.getUserStatuses(userId),
    enabled: isAdmin && Boolean(userId),
  });

  return {
    profile: profileQuery.data || null,
    classes: classesQuery.data || [],
    students: studentsQuery.data || [],
    attendance: attendanceQuery.data || [],
    statuses: statusesQuery.data || [],
    isLoading:
      profileQuery.isLoading ||
      classesQuery.isLoading ||
      studentsQuery.isLoading ||
      attendanceQuery.isLoading ||
      statusesQuery.isLoading,
  };
}
