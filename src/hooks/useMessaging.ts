import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  DEFAULT_MESSAGING_SETTINGS,
  DEFAULT_PROVIDER_AVAILABILITY,
  messagingService,
} from '../services/messagingService';
import type { MessagingSettings } from '../types/database';

export function useMessagingSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messaging_settings'],
    queryFn: () => messagingService.getMessagingSettings(),
    enabled: Boolean(user?.id),
  });

  const updateMutation = useMutation({
    mutationFn: (
      updates: Partial<
        Pick<
          MessagingSettings,
          | 'auto_send_enabled'
          | 'require_approval_before_send'
          | 'ai_urdu_enabled'
          | 'whatsapp_api_enabled'
          | 'telegram_api_enabled'
          | 'sms_api_enabled'
          | 'email_api_enabled'
        >
      >
    ) => messagingService.updateMessagingSettings(updates, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging_settings'] });
    },
  });

  return {
    settings: query.data?.settings || DEFAULT_MESSAGING_SETTINGS,
    schemaReady: query.data?.schemaReady ?? true,
    isLoading: query.isLoading,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}

export function useProviderAvailability() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['messaging_providers'],
    queryFn: () => messagingService.getProviderAvailability(),
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 2,
  });

  return {
    providers: query.data || DEFAULT_PROVIDER_AVAILABILITY,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useParentMessages(filters?: { studentId?: string; recordDate?: string }) {
  const { user, isAdmin } = useAuth();
  const userId = user?.id || '';

  const query = useQuery({
    queryKey: ['parent_messages', userId, isAdmin, filters?.studentId, filters?.recordDate],
    queryFn: () =>
      messagingService.getMessages({
        userId,
        isAdmin,
        studentId: filters?.studentId,
        recordDate: filters?.recordDate,
      }),
    enabled: Boolean(userId),
  });

  return {
    messages: query.data?.messages || [],
    schemaReady: query.data?.schemaReady ?? true,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
