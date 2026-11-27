import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type {
  AttendanceRecord,
  Json,
  MessageApprovalStatus,
  MessageDeliveryStatus,
  MessageGenerationSource,
  MessageSendMode,
  MessagingChannel,
  MessagingSettings,
  ParentMessage,
  ProviderAvailability,
  Student,
  StudentDailyPerformance,
  VerifiedDailyFacts,
} from '../types/database';
import {
  composeVerifiedUrduMessage,
  extractVerifiedDailyFacts,
  hasVerifiedDataForMessage,
  maskRecipient,
} from '../lib/parentMessaging';

function ensureConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }
}

export const DEFAULT_MESSAGING_SETTINGS: MessagingSettings = {
  id: 1,
  auto_send_enabled: false,
  require_approval_before_send: true,
  ai_urdu_enabled: true,
  whatsapp_api_enabled: false,
  telegram_api_enabled: false,
  sms_api_enabled: false,
  email_api_enabled: false,
  updated_by: null,
};

export const DEFAULT_PROVIDER_AVAILABILITY: ProviderAvailability = {
  whatsapp_api: false,
  telegram: false,
  sms: false,
  email: false,
  ai_llm: false,
  edgeFunctionReachable: false,
};

function isMissingRelationError(err: any): boolean {
  const code = String(err?.code || '');
  const msg = String(err?.message || '');
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    /relation .* does not exist|could not find the table/i.test(msg)
  );
}

export function getRecipientValueForChannel(
  student: Student,
  channel: MessagingChannel
): string | null {
  if (channel === 'whatsapp_manual' || channel === 'whatsapp_api' || channel === 'sms') {
    return student.parent_phone || null;
  }
  if (channel === 'telegram') {
    return student.telegram_chat_id || null;
  }
  if (channel === 'email') {
    return student.parent_email || null;
  }
  return null;
}

export const messagingService = {
  async getMessagingSettings(): Promise<{ settings: MessagingSettings; schemaReady: boolean }> {
    ensureConfigured();
    const { data, error } = await supabase
      .from('messaging_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error && isMissingRelationError(error)) {
      return { settings: DEFAULT_MESSAGING_SETTINGS, schemaReady: false };
    }
    if (error) throw error;
    return {
      settings: (data as MessagingSettings | null) || DEFAULT_MESSAGING_SETTINGS,
      schemaReady: true,
    };
  },

  async updateMessagingSettings(
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
    >,
    updatedBy: string
  ): Promise<MessagingSettings> {
    ensureConfigured();
    const { data, error } = await supabase
      .from('messaging_settings')
      .upsert({
        id: 1,
        ...updates,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as MessagingSettings;
  },

  async getProviderAvailability(): Promise<ProviderAvailability> {
    if (!isSupabaseConfigured || !supabase) return DEFAULT_PROVIDER_AVAILABILITY;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return DEFAULT_PROVIDER_AVAILABILITY;
    }

    try {
      const { data, error } = await (supabase.functions as any).invoke('parent-messaging', {
        body: { action: 'status' },
      });
      if (error || !data?.providers) {
        return DEFAULT_PROVIDER_AVAILABILITY;
      }
      return {
        whatsapp_api: Boolean(data.providers.whatsapp_api),
        telegram: Boolean(data.providers.telegram),
        sms: Boolean(data.providers.sms),
        email: Boolean(data.providers.email),
        ai_llm: Boolean(data.providers.ai_llm),
        edgeFunctionReachable: true,
      };
    } catch {
      return DEFAULT_PROVIDER_AVAILABILITY;
    }
  },

  async generateUrduDraft(params: {
    student: Student;
    className: string;
    recordDate: string;
    appName: string;
    attendance?: AttendanceRecord | null;
    performance?: StudentDailyPerformance | null;
  }): Promise<{
    messageUrdu: string;
    generatedBy: MessageGenerationSource;
    facts: VerifiedDailyFacts;
  }> {
    const facts = extractVerifiedDailyFacts({
      student: params.student,
      className: params.className,
      date: params.recordDate,
      attendance: params.attendance,
      performance: params.performance,
    });

    if (!hasVerifiedDataForMessage(facts) || !facts.attendanceStatus) {
      throw new Error(
        'No recorded attendance or daily Sabaq data exists for this student on this date.'
      );
    }

    if (isSupabaseConfigured && supabase && (typeof navigator === 'undefined' || navigator.onLine)) {
      try {
        const { data, error } = await (supabase.functions as any).invoke('parent-messaging', {
          body: {
            action: 'generate',
            studentId: params.student.id,
            recordDate: params.recordDate,
            appName: params.appName,
          },
        });
        if (!error && data?.messageUrdu && data?.facts) {
          return {
            messageUrdu: String(data.messageUrdu),
            generatedBy:
              data.generatedBy === 'ai_verified' ? 'ai_verified' : 'verified_composer',
            facts: data.facts as VerifiedDailyFacts,
          };
        }
      } catch {
        // Fall through cleanly to verified local Urdu composer using exact local/synced facts
      }
    }

    return {
      messageUrdu: composeVerifiedUrduMessage(facts, params.appName),
      generatedBy: 'verified_composer',
      facts,
    };
  },

  async getMessages(params: {
    userId: string;
    isAdmin?: boolean;
    studentId?: string;
    recordDate?: string;
    limit?: number;
  }): Promise<{ messages: ParentMessage[]; schemaReady: boolean }> {
    ensureConfigured();

    let query = supabase
      .from('parent_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(params.limit ?? 150);

    if (!params.isAdmin) {
      query = query.eq('user_id', params.userId);
    }
    if (params.studentId) {
      query = query.eq('student_id', params.studentId);
    }
    if (params.recordDate) {
      query = query.eq('record_date', params.recordDate);
    }

    const { data, error } = await query;
    if (error && isMissingRelationError(error)) {
      return { messages: [], schemaReady: false };
    }
    if (error) throw error;
    return { messages: (data || []) as ParentMessage[], schemaReady: true };
  },

  async upsertMessageRecord(params: {
    id?: string;
    userId: string;
    student: Student;
    classId: string;
    recordDate: string;
    channel: MessagingChannel;
    messageUrdu: string;
    facts: VerifiedDailyFacts;
    generatedBy: MessageGenerationSource;
    approvalStatus: MessageApprovalStatus;
    approvedBy?: string | null;
    sendMode: MessageSendMode;
    deliveryStatus: MessageDeliveryStatus;
    errorMessage?: string | null;
  }): Promise<ParentMessage> {
    ensureConfigured();

    const rawRecipient = getRecipientValueForChannel(params.student, params.channel);
    const recipientMasked = maskRecipient(params.channel, rawRecipient);
    const now = new Date().toISOString();

    if (params.id) {
      const { data, error } = await supabase
        .from('parent_messages')
        .update({
          channel: params.channel,
          recipient_masked: recipientMasked,
          message_urdu: params.messageUrdu,
          facts_snapshot: params.facts as unknown as Json,
          generated_by: params.generatedBy,
          approval_status: params.approvalStatus,
          approved_by:
            params.approvalStatus === 'approved' ? params.approvedBy || params.userId : null,
          approved_at: params.approvalStatus === 'approved' ? now : null,
          send_mode: params.sendMode,
          delivery_status: params.deliveryStatus,
          error_message: params.errorMessage ?? null,
          updated_at: now,
        })
        .eq('id', params.id)
        .select('*')
        .single();

      if (error) throw error;
      return data as ParentMessage;
    }

    const { data, error } = await supabase
      .from('parent_messages')
      .insert({
        user_id: params.userId,
        student_id: params.student.id,
        class_id: params.classId,
        record_date: params.recordDate,
        channel: params.channel,
        recipient_masked: recipientMasked,
        message_urdu: params.messageUrdu,
        facts_snapshot: params.facts as unknown as Json,
        generated_by: params.generatedBy,
        approval_status: params.approvalStatus,
        approved_by:
          params.approvalStatus === 'approved' ? params.approvedBy || params.userId : null,
        approved_at: params.approvalStatus === 'approved' ? now : null,
        send_mode: params.sendMode,
        delivery_status: params.deliveryStatus,
        error_message: params.errorMessage ?? null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as ParentMessage;
  },

  async sendViaOfficialApi(params: {
    messageId: string;
    sendMode: MessageSendMode;
  }): Promise<{ deliveryStatus: MessageDeliveryStatus; providerMessageId: string | null }> {
    ensureConfigured();

    const { data, error } = await (supabase.functions as any).invoke('parent-messaging', {
      body: {
        action: 'send',
        messageId: params.messageId,
        sendMode: params.sendMode,
      },
    });

    if (error) {
      const msg = error?.message || 'Messaging service is unreachable.';
      await supabase
        .from('parent_messages')
        .update({ delivery_status: 'failed', error_message: msg })
        .eq('id', params.messageId);
      throw new Error(msg);
    }

    if (data?.error) {
      throw new Error(String(data.error));
    }

    if (!data?.deliveryStatus || (data.deliveryStatus === 'sent' && !data.providerMessageId)) {
      throw new Error('Messaging service did not return a confirmed delivery response.');
    }

    return {
      deliveryStatus: data.deliveryStatus as MessageDeliveryStatus,
      providerMessageId: (data.providerMessageId as string | null) ?? null,
    };
  },

  async refreshDeliveryStatus(messageId: string): Promise<{
    deliveryStatus: MessageDeliveryStatus;
    supported: boolean;
    message?: string;
  }> {
    ensureConfigured();

    const { data, error } = await (supabase.functions as any).invoke('parent-messaging', {
      body: { action: 'refresh_status', messageId },
    });

    if (error) throw new Error(error?.message || 'Could not refresh delivery status');
    if (data?.error) throw new Error(String(data.error));

    return {
      deliveryStatus: data.deliveryStatus as MessageDeliveryStatus,
      supported: Boolean(data.supported),
      message: data.message ? String(data.message) : undefined,
    };
  },
};
