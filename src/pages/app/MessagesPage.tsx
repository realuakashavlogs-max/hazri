import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle2,
  ExternalLink,
  History,
  Lock,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { useClasses } from '../../hooks/useClasses';
import { useStudents } from '../../hooks/useStudents';
import { useUserAttendanceForDate } from '../../hooks/useAttendance';
import { useUserPerformanceForDate } from '../../hooks/usePerformance';
import {
  useMessagingSettings,
  useParentMessages,
  useProviderAvailability,
} from '../../hooks/useMessaging';
import {
  getRecipientValueForChannel,
  messagingService,
} from '../../services/messagingService';
import {
  extractVerifiedDailyFacts,
  hasVerifiedDataForMessage,
} from '../../lib/parentMessaging';
import { buildDirectWhatsAppUrl } from '../../lib/whatsapp';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  ApprovalStatusBadge,
  DeliveryStatusBadge,
} from '../../components/messaging/DeliveryStatusBadge';
import { ParentMessageComposerModal } from '../../components/messaging/ParentMessageComposerModal';
import type {
  MessageDeliveryStatus,
  MessagingChannel,
  ParentMessage,
  Student,
} from '../../types/database';

type TabKey = 'queue' | 'history' | 'controls';

const CHANNEL_LABEL: Record<MessagingChannel, string> = {
  whatsapp_manual: 'WhatsApp (Manual)',
  whatsapp_api: 'WhatsApp Business API',
  telegram: 'Telegram',
  sms: 'SMS',
  email: 'Email',
};

export const MessagesPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { effectiveAppName } = useSettings();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>('queue');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { classes } = useClasses();
  const { students, isLoading: studentsLoading } = useStudents(
    selectedClassId === 'all' ? undefined : selectedClassId
  );
  const { records: dayAttendance } = useUserAttendanceForDate(selectedDate);
  const { records: dayPerformance } = useUserPerformanceForDate(selectedDate);
  const {
    settings: messagingSettings,
    schemaReady: settingsSchemaReady,
    updateSettings,
    isUpdating,
  } = useMessagingSettings();
  const { providers, refetch: refetchProviders, isLoading: loadingProviders } =
    useProviderAvailability();
  const {
    messages: historyMessages,
    schemaReady: messagesSchemaReady,
    isLoading: historyLoading,
    refetch: refetchMessages,
  } = useParentMessages();

  const [composerTarget, setComposerTarget] = useState<{
    student: Student;
    className: string;
  } | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [refreshingMessageId, setRefreshingMessageId] = useState<string | null>(null);
  const [sendingMessageId, setSendingMessageId] = useState<string | null>(null);

  const classMap = useMemo(
    () => new Map(classes.map((c) => [c.id, c])),
    [classes]
  );
  const studentMap = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  );
  const attendanceByStudent = useMemo(
    () => new Map(dayAttendance.map((a) => [a.student_id, a])),
    [dayAttendance]
  );
  const performanceByStudent = useMemo(
    () => new Map(dayPerformance.map((p) => [p.student_id, p])),
    [dayPerformance]
  );

  const messageByStudentDate = useMemo(() => {
    const map = new Map<string, ParentMessage>();
    for (const msg of historyMessages) {
      if (msg.record_date === selectedDate && !map.has(msg.student_id)) {
        map.set(msg.student_id, msg);
      }
    }
    return map;
  }, [historyMessages, selectedDate]);

  const queueItems = useMemo(() => {
    return students.map((student) => {
      const cls = classMap.get(student.class_id);
      const att = attendanceByStudent.get(student.id) || null;
      const perf = performanceByStudent.get(student.id) || null;
      const facts = extractVerifiedDailyFacts({
        student,
        className: cls?.name || '',
        date: selectedDate,
        attendance: att,
        performance: perf,
      });
      return {
        student,
        className: cls?.name || '',
        att,
        perf,
        facts,
        hasData: hasVerifiedDataForMessage(facts),
        existingMessage: messageByStudentDate.get(student.id) || null,
      };
    });
  }, [
    students,
    classMap,
    attendanceByStudent,
    performanceByStudent,
    selectedDate,
    messageByStudentDate,
  ]);

  const recordedQueueItems = useMemo(
    () => queueItems.filter((item) => item.hasData),
    [queueItems]
  );

  const filteredHistory = useMemo(() => {
    if (statusFilter === 'all') return historyMessages;
    return historyMessages.filter((m) => m.delivery_status === statusFilter);
  }, [historyMessages, statusFilter]);

  const handlePrepareBatchDrafts = async () => {
    if (!user?.id || recordedQueueItems.length === 0) return;
    setBatchGenerating(true);
    let created = 0;

    try {
      for (const item of recordedQueueItems) {
        if (item.existingMessage) continue;
        const generated = await messagingService.generateUrduDraft({
          student: item.student,
          className: item.className,
          recordDate: selectedDate,
          appName: effectiveAppName,
          attendance: item.att,
          performance: item.perf,
        });

        await messagingService.upsertMessageRecord({
          userId: user.id,
          student: item.student,
          classId: item.student.class_id,
          recordDate: selectedDate,
          channel: 'whatsapp_manual',
          messageUrdu: generated.messageUrdu,
          facts: generated.facts,
          generatedBy: generated.generatedBy,
          approvalStatus: 'draft',
          sendMode: 'manual',
          deliveryStatus: 'draft',
        });
        created++;
      }

      await refetchMessages();
      showToast(
        created > 0
          ? `Prepared ${created} verified Urdu draft(s) for teacher review.`
          : 'All recorded students already have drafts for this date.',
        created > 0 ? 'success' : 'info'
      );
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Could not prepare batch Urdu drafts.',
        'error'
      );
    } finally {
      setBatchGenerating(false);
    }
  };

  const handleQuickApprove = async (msg: ParentMessage, student: Student) => {
    if (!user?.id) return;
    try {
      await messagingService.upsertMessageRecord({
        id: msg.id,
        userId: msg.user_id,
        student,
        classId: msg.class_id,
        recordDate: msg.record_date,
        channel: msg.channel,
        messageUrdu: msg.message_urdu,
        facts: msg.facts_snapshot as any,
        generatedBy: msg.generated_by,
        approvalStatus: 'approved',
        approvedBy: user.id,
        sendMode: msg.send_mode,
        deliveryStatus: 'ready_for_manual_send',
      });
      await refetchMessages();
      showToast('Message approved for sending.', 'success');
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Could not approve message.',
        'error'
      );
    }
  };

  const handleQuickManualWhatsApp = async (msg: ParentMessage, student: Student) => {
    if (!user?.id) return;
    if (!student.messaging_consent) {
      showToast('Parent consent is required before sending.', 'error');
      return;
    }
    if (msg.approval_status !== 'approved') {
      showToast('Please approve the message first.', 'info');
      return;
    }
    window.open(
      buildDirectWhatsAppUrl(student.parent_phone, msg.message_urdu),
      '_blank',
      'noopener,noreferrer'
    );
    try {
      await messagingService.upsertMessageRecord({
        id: msg.id,
        userId: msg.user_id,
        student,
        classId: msg.class_id,
        recordDate: msg.record_date,
        channel: 'whatsapp_manual',
        messageUrdu: msg.message_urdu,
        facts: msg.facts_snapshot as any,
        generatedBy: msg.generated_by,
        approvalStatus: 'approved',
        approvedBy: user.id,
        sendMode: 'manual',
        deliveryStatus: 'opened_in_whatsapp',
      });
      await refetchMessages();
    } catch {
      // Non-blocking log error
    }
  };

  const handleQuickApiSend = async (msg: ParentMessage) => {
    setSendingMessageId(msg.id);
    try {
      const res = await messagingService.sendViaOfficialApi({
        messageId: msg.id,
        sendMode: 'automatic',
      });
      await refetchMessages();
      showToast(`Confirmed status: ${res.deliveryStatus}`, 'success');
    } catch (err: unknown) {
      await refetchMessages();
      showToast(
        err instanceof Error ? err.message : 'Official API send failed.',
        'error'
      );
    } finally {
      setSendingMessageId(null);
    }
  };

  const handleRefreshStatus = async (messageId: string) => {
    setRefreshingMessageId(messageId);
    try {
      const res = await messagingService.refreshDeliveryStatus(messageId);
      await refetchMessages();
      showToast(
        res.message || `Updated delivery status: ${res.deliveryStatus}`,
        'info'
      );
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Could not refresh delivery status.',
        'error'
      );
    } finally {
      setRefreshingMessageId(null);
    }
  };

  const handleAdminSettingToggle = async (
    key:
      | 'auto_send_enabled'
      | 'require_approval_before_send'
      | 'ai_urdu_enabled'
      | 'whatsapp_api_enabled'
      | 'telegram_api_enabled'
      | 'sms_api_enabled'
      | 'email_api_enabled',
    nextVal: boolean
  ) => {
    if (!isAdmin) {
      showToast('Only Admin can modify automatic messaging controls.', 'error');
      return;
    }
    try {
      await updateSettings({ [key]: nextVal });
      queryClient.invalidateQueries({ queryKey: ['messaging_settings'] });
      showToast('Messaging control updated.', 'success');
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Could not update messaging setting.',
        'error'
      );
    }
  };

  const schemaWarning = !settingsSchemaReady || !messagesSchemaReady;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-extrabold text-[var(--color-text)] flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-[#16A34A]" />
            <span>AI Parent Messaging</span>
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Verified Urdu reports from daily attendance &amp; Sabaq records with review, consent, and delivery tracking
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
              messagingSettings.auto_send_enabled
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                : 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
            }`}
          >
            Auto-Send: {messagingSettings.auto_send_enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {schemaWarning && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs sm:text-sm font-semibold text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Database migration required for full cloud message logs</p>
            <p className="mt-0.5 opacity-90">
              Apply <code>supabase/migrations/20261127010000_ai_parent_messaging.sql</code> in Supabase to persist parent consent, Admin auto-send controls, and message history. Manual WhatsApp preparation still works safely.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: 'queue', label: 'Daily Review Queue', icon: Sparkles },
            { id: 'history', label: `Message History (${historyMessages.length})`, icon: History },
            { id: 'controls', label: 'Safety & API Controls', icon: Sliders },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:border-primary/60'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DAILY REVIEW QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 flex flex-col md:flex-row md:items-end justify-between gap-3 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
                  Class
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 text-sm font-bold rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]"
                >
                  <option value="all">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
                  Date
                </label>
                <div className="flex items-center gap-2 px-3 min-h-[44px] rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-transparent text-sm font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={handlePrepareBatchDrafts}
              isLoading={batchGenerating}
              disabled={recordedQueueItems.length === 0 || !messagesSchemaReady}
              className="gap-1.5 shrink-0"
            >
              <Bot className="w-4 h-4" />
              <span>Prepare Urdu Drafts ({recordedQueueItems.length})</span>
            </Button>
          </div>

          {studentsLoading ? (
            <SkeletonCard count={3} />
          ) : recordedQueueItems.length === 0 ? (
            <EmptyState
              variant="attendance"
              title="No Recorded Students for This Date"
              description="Mark attendance or record daily Sabaq performance first. Hazri Book will never invent student performance."
              action={
                <Link
                  to="/performance"
                  className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-primary text-white text-sm font-bold"
                >
                  Record Daily Sabaq
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {recordedQueueItems.map(({ student, className, facts, existingMessage }) => (
                <div
                  key={student.id}
                  className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 space-y-3 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/students/${student.id}`}
                          className="font-extrabold text-base text-[var(--color-text)] hover:text-primary"
                        >
                          {student.name}
                        </Link>
                        {className && (
                          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-[var(--color-muted)]">
                            {className}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            student.messaging_consent
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                          }`}
                        >
                          {student.messaging_consent ? 'Parent Consent ✓' : 'Consent Needed'}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--color-muted)]">
                        Attendance: <strong>{facts.attendanceStatus}</strong>
                        {facts.hasPerformanceRecord
                          ? ` • Sabaq: ${facts.sabaqListened ? `${facts.sabaqLines} lines` : 'No'} • Sabqi: ${facts.sabqiListened ? `${facts.sabqiLines} lines` : 'No'} • Manzil: ${facts.manzilListened ? `${facts.manzilLines} lines` : 'No'}`
                          : ' • Attendance only'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {existingMessage && (
                        <>
                          <ApprovalStatusBadge status={existingMessage.approval_status} />
                          <DeliveryStatusBadge status={existingMessage.delivery_status} />
                        </>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setComposerTarget({ student, className })}
                        className="gap-1.5 bg-[#16A34A] hover:bg-green-700 text-white"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{existingMessage ? 'Review / WhatsApp' : 'Prepare Urdu WhatsApp'}</span>
                      </Button>
                    </div>
                  </div>

                  {existingMessage && (
                    <div className="rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] p-3 space-y-2.5">
                      <p dir="rtl" className="text-xs sm:text-sm whitespace-pre-line leading-relaxed text-[var(--color-text)]">
                        {existingMessage.message_urdu}
                      </p>
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {existingMessage.approval_status !== 'approved' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => handleQuickApprove(existingMessage, student)}
                            className="gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            !student.messaging_consent ||
                            existingMessage.approval_status !== 'approved'
                          }
                          onClick={() => handleQuickManualWhatsApp(existingMessage, student)}
                          className="gap-1.5 bg-[#16A34A] hover:bg-green-700 text-white"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Send Manually in WhatsApp</span>
                        </Button>
                        {existingMessage.channel !== 'whatsapp_manual' && (
                          <Button
                            type="button"
                            size="sm"
                            isLoading={sendingMessageId === existingMessage.id}
                            disabled={
                              !student.messaging_consent ||
                              existingMessage.approval_status !== 'approved' ||
                              !messagingSettings.auto_send_enabled ||
                              !getRecipientValueForChannel(student, existingMessage.channel)
                            }
                            onClick={() => handleQuickApiSend(existingMessage)}
                            className="gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send via API</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MESSAGE HISTORY & DELIVERY STATUS */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-3.5 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  ['all', 'All'],
                  ['opened_in_whatsapp', 'WhatsApp Manual'],
                  ['sent', 'Sent'],
                  ['delivered', 'Delivered'],
                  ['failed', 'Failed'],
                  ['blocked', 'Blocked'],
                  ['draft', 'Draft'],
                ] as [string, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`px-3 min-h-[38px] rounded-xl text-xs font-bold transition-colors ${
                    statusFilter === key
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-[var(--color-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => refetchMessages()}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
          </div>

          {historyLoading ? (
            <SkeletonCard count={3} />
          ) : filteredHistory.length === 0 ? (
            <EmptyState
              variant="attendance"
              title="No Message History Yet"
              description="Approved, manually opened WhatsApp, and API-sent parent messages appear here with honest delivery status."
            />
          ) : (
            <div className="space-y-2.5">
              {filteredHistory.map((msg) => {
                const st = studentMap.get(msg.student_id);
                const canPollStatus =
                  Boolean(msg.provider_message_id) &&
                  (msg.channel === 'sms' || msg.channel === 'email');

                return (
                  <div
                    key={msg.id}
                    className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[var(--color-text)]">
                          {st?.name || 'Student'}
                        </span>
                        <span className="font-mono text-xs text-[var(--color-muted)]">
                          {msg.record_date}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800">
                          {CHANNEL_LABEL[msg.channel]}
                        </span>
                        {msg.recipient_masked && (
                          <span className="font-mono text-xs text-[var(--color-muted)]">
                            {msg.recipient_masked}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <ApprovalStatusBadge status={msg.approval_status} />
                        <DeliveryStatusBadge
                          status={msg.delivery_status as MessageDeliveryStatus}
                        />
                      </div>
                    </div>

                    <p
                      dir="rtl"
                      className="text-xs sm:text-sm whitespace-pre-line bg-[var(--color-bg)] rounded-xl p-3 border border-[var(--color-border)] leading-relaxed"
                    >
                      {msg.message_urdu}
                    </p>

                    <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-[var(--color-muted)]">
                      <div>
                        {msg.provider_message_id && (
                          <span className="font-mono">
                            Provider ID: {msg.provider_message_id}
                          </span>
                        )}
                        {msg.error_message && (
                          <span className="text-red-600 dark:text-red-400 font-semibold">
                            {msg.error_message}
                          </span>
                        )}
                      </div>

                      {canPollStatus && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          isLoading={refreshingMessageId === msg.id}
                          onClick={() => handleRefreshStatus(msg.id)}
                          className="gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Check Delivery Status</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SAFETY & API CONTROLS */}
      {activeTab === 'controls' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-extrabold text-base text-[var(--color-text)] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span>Admin Messaging Controls</span>
              </h2>
              {!isAdmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-[var(--color-muted)]">
                  <Lock className="w-3 h-3" />
                  <span>Admin Only</span>
                </span>
              )}
            </div>

            <div className="space-y-3">
              {(
                [
                  {
                    key: 'auto_send_enabled',
                    title: 'Enable Automatic Messaging',
                    desc: 'Master Admin switch required before any official API can send automatically.',
                    value: messagingSettings.auto_send_enabled,
                  },
                  {
                    key: 'require_approval_before_send',
                    title: 'Require Teacher / Admin Approval',
                    desc: 'Messages must be reviewed and approved before WhatsApp or API dispatch.',
                    value: messagingSettings.require_approval_before_send,
                  },
                  {
                    key: 'whatsapp_api_enabled',
                    title: 'Allow WhatsApp Business API',
                    desc: 'Authorized sending via Meta WhatsApp Cloud API when configured.',
                    value: messagingSettings.whatsapp_api_enabled,
                  },
                  {
                    key: 'telegram_api_enabled',
                    title: 'Allow Telegram Bot API',
                    desc: 'Send approved Urdu updates to consented parents with a Telegram Chat ID.',
                    value: messagingSettings.telegram_api_enabled,
                  },
                  {
                    key: 'sms_api_enabled',
                    title: 'Allow Official SMS API (Twilio)',
                    desc: 'Send approved Urdu SMS messages with live delivery status checks.',
                    value: messagingSettings.sms_api_enabled,
                  },
                  {
                    key: 'email_api_enabled',
                    title: 'Allow Official Email API (Resend)',
                    desc: 'Send approved Urdu reports to consented parent email addresses.',
                    value: messagingSettings.email_api_enabled,
                  },
                ] as const
              ).map((ctrl) => (
                <div
                  key={ctrl.key}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--color-text)]">
                      {ctrl.title}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">{ctrl.desc}</p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={ctrl.value}
                    aria-label={ctrl.title}
                    disabled={!isAdmin || isUpdating || !settingsSchemaReady}
                    onClick={() => handleAdminSettingToggle(ctrl.key, !ctrl.value)}
                    className={`w-14 h-8 shrink-0 flex items-center rounded-full p-1 transition-colors ${
                      ctrl.value ? 'bg-[#16A34A]' : 'bg-slate-300 dark:bg-slate-700'
                    } ${!isAdmin || !settingsSchemaReady ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`bg-white w-6 h-6 rounded-full shadow transition-transform ${
                        ctrl.value ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-extrabold text-base text-[var(--color-text)] flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <span>Connected Messaging Services</span>
              </h2>
              <Button
                type="button"
                size="sm"
                variant="outline"
                isLoading={loadingProviders}
                onClick={() => refetchProviders()}
                className="gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check APIs</span>
              </Button>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                {
                  name: 'WhatsApp Manual Link (wa.me)',
                  configured: true,
                  detail: 'Always ready for manual review & sending inside WhatsApp.',
                },
                {
                  name: 'WhatsApp Business Cloud API',
                  configured: providers.whatsapp_api,
                  detail: 'Configured in Supabase Edge Function secrets for Meta WhatsApp Cloud API.',
                },
                {
                  name: 'Telegram Bot API',
                  configured: providers.telegram,
                  detail: 'Configured in Supabase Edge Function secrets for Telegram Bot API.',
                },
                {
                  name: 'SMS API (Twilio)',
                  configured: providers.sms,
                  detail: 'Configured in Supabase Edge Function secrets for Twilio Programmable SMS.',
                },
                {
                  name: 'Email API (Resend)',
                  configured: providers.email,
                  detail: 'Configured in Supabase Edge Function secrets for Resend Email API.',
                },
                {
                  name: 'Server AI Urdu Model (Gemini)',
                  configured: providers.ai_llm,
                  detail: 'Optional server-side AI configuration in Supabase secrets; verified Urdu composer runs safely whenever offline or unconfigured.',
                },
              ].map((svc) => (
                <div
                  key={svc.name}
                  className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-[var(--color-text)]">
                      {svc.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        svc.configured
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {svc.configured ? 'Configured' : 'Not Configured'}
                    </span>
                  </div>
                  <p className="text-[var(--color-muted)]">{svc.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {composerTarget && (
        <ParentMessageComposerModal
          isOpen={Boolean(composerTarget)}
          onClose={() => setComposerTarget(null)}
          student={composerTarget.student}
          className={composerTarget.className}
          recordDate={selectedDate}
        />
      )}
    </div>
  );
};
