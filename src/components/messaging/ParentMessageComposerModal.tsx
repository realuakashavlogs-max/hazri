import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Lock,
  MessageCircle,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SkeletonCard } from '../ui/Skeleton';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { usePerformanceRecordForDate } from '../../hooks/usePerformance';
import { useStudentAttendanceForDate } from '../../hooks/useAttendance';
import { useMessagingSettings, useProviderAvailability } from '../../hooks/useMessaging';
import { studentsService } from '../../services/studentsService';
import {
  getRecipientValueForChannel,
  messagingService,
} from '../../services/messagingService';
import {
  extractVerifiedDailyFacts,
  hasVerifiedDataForMessage,
  verifyUrduMessageFacts,
} from '../../lib/parentMessaging';
import { buildDirectWhatsAppUrl } from '../../lib/whatsapp';
import type {
  MessageApprovalStatus,
  MessageDeliveryStatus,
  MessageGenerationSource,
  MessagingChannel,
  Student,
} from '../../types/database';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';

interface ParentMessageComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  className: string;
  recordDate: string;
}

const CHANNEL_OPTIONS: {
  id: MessagingChannel;
  label: string;
  requiresServerApi: boolean;
}[] = [
  { id: 'whatsapp_manual', label: 'WhatsApp (Manual)', requiresServerApi: false },
  { id: 'whatsapp_api', label: 'WhatsApp Business API', requiresServerApi: true },
  { id: 'telegram', label: 'Telegram Bot', requiresServerApi: true },
  { id: 'sms', label: 'SMS (Twilio)', requiresServerApi: true },
  { id: 'email', label: 'Email', requiresServerApi: true },
];

export const ParentMessageComposerModal: React.FC<ParentMessageComposerModalProps> = ({
  isOpen,
  onClose,
  student,
  className,
  recordDate,
}) => {
  const { user } = useAuth();
  const { effectiveAppName } = useSettings();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { record: performanceRecord, isLoading: loadingPerf } =
    usePerformanceRecordForDate(student.id, recordDate);
  const { record: attendanceRecord, isLoading: loadingAtt } =
    useStudentAttendanceForDate(student.id, recordDate);
  const { settings: messagingSettings, schemaReady } = useMessagingSettings();
  const { providers } = useProviderAvailability();

  const [localConsent, setLocalConsent] = useState<boolean>(
    Boolean(student.messaging_consent)
  );
  const [savingConsent, setSavingConsent] = useState(false);

  const [selectedChannel, setSelectedChannel] =
    useState<MessagingChannel>('whatsapp_manual');
  const [messageUrdu, setMessageUrdu] = useState('');
  const [generatedBy, setGeneratedBy] =
    useState<MessageGenerationSource>('verified_composer');
  const [approvalStatus, setApprovalStatus] =
    useState<MessageApprovalStatus>('draft');
  const [deliveryStatus, setDeliveryStatus] =
    useState<MessageDeliveryStatus>('draft');
  const [savedMessageId, setSavedMessageId] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setLocalConsent(Boolean(student.messaging_consent));
  }, [student.id, student.messaging_consent, isOpen]);

  const facts = useMemo(
    () =>
      extractVerifiedDailyFacts({
        student,
        className,
        date: recordDate,
        attendance: attendanceRecord,
        performance: performanceRecord,
      }),
    [student, className, recordDate, attendanceRecord, performanceRecord]
  );

  const hasData = hasVerifiedDataForMessage(facts);

  const factCheck = useMemo(
    () => verifyUrduMessageFacts(messageUrdu, facts),
    [messageUrdu, facts]
  );

  const generateMessage = async () => {
    if (!hasData) return;
    setIsGenerating(true);
    setActionError(null);
    try {
      const res = await messagingService.generateUrduDraft({
        student,
        className,
        recordDate,
        appName: effectiveAppName,
        attendance: attendanceRecord,
        performance: performanceRecord,
      });
      setMessageUrdu(res.messageUrdu);
      setGeneratedBy(res.generatedBy);
      setApprovalStatus('draft');
      setDeliveryStatus('draft');
      setSavedMessageId(undefined);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to generate verified Urdu message.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!isOpen || loadingPerf || loadingAtt) return;
    if (!hasData) {
      setMessageUrdu('');
      setApprovalStatus('draft');
      setDeliveryStatus('draft');
      return;
    }
    void generateMessage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, student.id, recordDate, loadingPerf, loadingAtt, hasData]);

  const handleToggleConsent = async () => {
    const nextConsent = !localConsent;
    setSavingConsent(true);
    setActionError(null);
    try {
      await studentsService.updateStudent(student.id, {
        messaging_consent: nextConsent,
        consent_updated_at: nextConsent ? new Date().toISOString() : null,
      });
      setLocalConsent(nextConsent);
      queryClient.invalidateQueries({ queryKey: ['students'] });
      showToast(
        nextConsent
          ? 'Parent messaging consent recorded.'
          : 'Parent messaging consent withdrawn.',
        nextConsent ? 'success' : 'info'
      );
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Could not update parent consent.',
        'error'
      );
    } finally {
      setSavingConsent(false);
    }
  };

  const handleApproveMessage = async () => {
    if (!user?.id || !hasData || !messageUrdu.trim()) return;
    setActionError(null);
    try {
      let id = savedMessageId;
      if (schemaReady) {
        const saved = await messagingService.upsertMessageRecord({
          id: savedMessageId,
          userId: user.id,
          student,
          classId: student.class_id,
          recordDate,
          channel: selectedChannel,
          messageUrdu: messageUrdu.trim(),
          facts,
          generatedBy,
          approvalStatus: 'approved',
          approvedBy: user.id,
          sendMode: selectedChannel === 'whatsapp_manual' ? 'manual' : 'automatic',
          deliveryStatus: 'ready_for_manual_send',
        });
        id = saved.id;
        queryClient.invalidateQueries({ queryKey: ['parent_messages'] });
      }
      setSavedMessageId(id);
      setApprovalStatus('approved');
      setDeliveryStatus('ready_for_manual_send');
      showToast('Urdu message reviewed and approved.', 'success');
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Could not save message approval.'
      );
    }
  };

  const handleManualWhatsAppOpen = async () => {
    if (!user?.id || !localConsent || approvalStatus !== 'approved') return;
    setActionError(null);

    const whatsappUrl = buildDirectWhatsAppUrl(student.parent_phone, messageUrdu.trim());
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

    try {
      if (schemaReady) {
        const saved = await messagingService.upsertMessageRecord({
          id: savedMessageId,
          userId: user.id,
          student,
          classId: student.class_id,
          recordDate,
          channel: 'whatsapp_manual',
          messageUrdu: messageUrdu.trim(),
          facts,
          generatedBy,
          approvalStatus: 'approved',
          approvedBy: user.id,
          sendMode: 'manual',
          deliveryStatus: 'opened_in_whatsapp',
        });
        setSavedMessageId(saved.id);
        queryClient.invalidateQueries({ queryKey: ['parent_messages'] });
      }
      setDeliveryStatus('opened_in_whatsapp');
      showToast(
        'WhatsApp opened with the approved Urdu message. Complete sending manually in WhatsApp.',
        'info'
      );
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'WhatsApp opened, but log entry failed.',
        'info'
      );
    }
  };

  const handleApiSend = async () => {
    if (!user?.id || selectedChannel === 'whatsapp_manual') return;
    if (!localConsent) {
      setActionError('Parent messaging consent is required before sending.');
      return;
    }
    if (approvalStatus !== 'approved') {
      setActionError('Please review and approve the message before sending.');
      return;
    }
    if (!messagingSettings.auto_send_enabled) {
      setActionError('Automatic API messaging is disabled by Admin.');
      return;
    }

    setIsSending(true);
    setActionError(null);
    try {
      const saved = await messagingService.upsertMessageRecord({
        id: savedMessageId,
        userId: user.id,
        student,
        classId: student.class_id,
        recordDate,
        channel: selectedChannel,
        messageUrdu: messageUrdu.trim(),
        facts,
        generatedBy,
        approvalStatus: 'approved',
        approvedBy: user.id,
        sendMode: 'automatic',
        deliveryStatus: 'queued',
      });
      setSavedMessageId(saved.id);

      const res = await messagingService.sendViaOfficialApi({
        messageId: saved.id,
        sendMode: 'automatic',
      });
      setDeliveryStatus(res.deliveryStatus);
      queryClient.invalidateQueries({ queryKey: ['parent_messages'] });
      showToast(
        `Message status confirmed by service: ${res.deliveryStatus}`,
        'success'
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Official messaging service could not send.';
      setDeliveryStatus('failed');
      setActionError(msg);
      queryClient.invalidateQueries({ queryKey: ['parent_messages'] });
      showToast(msg, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const recipientValue = getRecipientValueForChannel(student, selectedChannel);
  const providerConfigured =
    selectedChannel === 'whatsapp_manual'
      ? true
      : selectedChannel === 'whatsapp_api'
        ? providers.whatsapp_api
        : selectedChannel === 'telegram'
          ? providers.telegram
          : selectedChannel === 'sms'
            ? providers.sms
            : providers.email;

  const channelEnabledByAdmin =
    selectedChannel === 'whatsapp_manual'
      ? true
      : selectedChannel === 'whatsapp_api'
        ? messagingSettings.whatsapp_api_enabled
        : selectedChannel === 'telegram'
          ? messagingSettings.telegram_api_enabled
          : selectedChannel === 'sms'
            ? messagingSettings.sms_api_enabled
            : messagingSettings.email_api_enabled;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`AI Urdu Parent Message • ${student.name}`}
      maxWidth="lg"
    >
      {loadingPerf || loadingAtt ? (
        <SkeletonCard count={2} />
      ) : (
        <div className="space-y-4 text-sm">
          {/* Verified Recorded Data Summary */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--color-muted)]">
                Verified Record ({recordDate})
              </span>
              <DeliveryStatusBadge status={deliveryStatus} />
            </div>

            {!hasData ? (
              <div className="flex items-start gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  No attendance or daily Sabaq record exists for {student.name} on {recordDate}. Save attendance or daily performance first so AI never invents data.
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                  Attendance: {facts.attendanceStatus}
                </span>
                {facts.hasPerformanceRecord ? (
                  <>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                      Sabaq: {facts.sabaqListened ? `Yes (${facts.sabaqLines} lines)` : 'No (0)'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300">
                      Sabqi: {facts.sabqiListened ? `Yes (${facts.sabqiLines} lines)` : 'No (0)'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300">
                      Manzil: {facts.manzilListened ? `Yes (${facts.manzilLines} lines)` : 'No (0)'}
                    </span>
                  </>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                    Attendance only (no Sabaq record logged yet)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Parent Consent Guard */}
          <div
            className={`rounded-2xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
              localConsent
                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/25'
                : 'border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30'
            }`}
          >
            <div className="flex items-start gap-2 text-xs font-semibold">
              {localConsent ? (
                <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold text-[var(--color-text)]">
                  {localConsent
                    ? 'Parent Messaging Consent Verified'
                    : 'Parent Consent Required Before Sending'}
                </p>
                <p className="text-[var(--color-muted)]">
                  {localConsent
                    ? 'Authorized teacher can approve and send this update.'
                    : 'Confirm parent permission before opening WhatsApp or sending via API.'}
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              variant={localConsent ? 'outline' : 'primary'}
              onClick={handleToggleConsent}
              isLoading={savingConsent}
              className="shrink-0"
            >
              {localConsent ? 'Revoke Consent' : 'Confirm Parent Consent'}
            </Button>
          </div>

          {hasData && (
            <>
              {/* Channel Picker */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--color-muted)]">
                  Delivery Channel
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CHANNEL_OPTIONS.map((ch) => {
                    const active = selectedChannel === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => {
                          setSelectedChannel(ch.id);
                          setActionError(null);
                        }}
                        className={`min-h-[42px] px-2.5 py-2 rounded-xl border text-xs font-bold transition-colors ${
                          active
                            ? 'bg-primary text-white border-primary'
                            : 'bg-[var(--color-bg)] text-[var(--color-text)] border-[var(--color-border)] hover:border-primary/60'
                        }`}
                      >
                        {ch.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[var(--color-muted)] font-mono">
                  Recipient:{' '}
                  {recipientValue ||
                    (selectedChannel === 'whatsapp_manual'
                      ? 'No saved phone (WhatsApp lets you pick recipient manually)'
                      : 'Missing contact info on student profile')}
                </p>
              </div>

              {/* AI Urdu Message Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text)]">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>
                      Urdu Message ({generatedBy === 'ai_verified' ? 'AI Verified' : generatedBy === 'teacher_edited' ? 'Edited' : 'Verified Urdu'})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={generateMessage}
                    disabled={isGenerating}
                    className="text-xs font-bold text-primary hover:underline disabled:opacity-50"
                  >
                    {isGenerating ? 'Preparing...' : 'Regenerate Urdu Draft'}
                  </button>
                </div>

                <textarea
                  dir="rtl"
                  rows={6}
                  aria-label="Urdu message for parent"
                  value={messageUrdu}
                  onChange={(e) => {
                    setMessageUrdu(e.target.value);
                    setGeneratedBy('teacher_edited');
                    setApprovalStatus('draft');
                    setDeliveryStatus('draft');
                  }}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3 text-sm leading-relaxed text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary"
                />

                {!factCheck.isAccurate && (
                  <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-2.5 text-xs font-semibold text-amber-800 dark:text-amber-200 space-y-1">
                    {factCheck.warnings.map((w) => (
                      <p key={w}>• {w}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* API Safety Status Notice for non-manual channels */}
              {selectedChannel !== 'whatsapp_manual' && (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--color-text)]">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    <span>Automatic / Official API Controls</span>
                  </div>
                  <p className="text-[var(--color-muted)]">
                    Admin Auto-Messaging:{' '}
                    <strong className={messagingSettings.auto_send_enabled ? 'text-[#16A34A]' : 'text-amber-600'}>
                      {messagingSettings.auto_send_enabled ? 'Enabled' : 'Disabled by Admin'}
                    </strong>{' '}
                    • Channel:{' '}
                    <strong>{channelEnabledByAdmin ? 'Enabled' : 'Disabled'}</strong> •
                    Server API:{' '}
                    <strong className={providerConfigured ? 'text-[#16A34A]' : 'text-amber-600'}>
                      {providerConfigured ? 'Configured' : 'Not Configured'}
                    </strong>
                  </p>
                </div>
              )}

              {actionError && (
                <div className="rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 text-xs font-semibold text-red-700 dark:text-red-300">
                  {actionError}
                </div>
              )}

              {/* Review, Approve & Send Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]">
                <Button
                  type="button"
                  variant={approvalStatus === 'approved' ? 'outline' : 'secondary'}
                  onClick={handleApproveMessage}
                  disabled={!messageUrdu.trim() || isGenerating}
                  className="gap-1.5"
                >
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      approvalStatus === 'approved' ? 'text-[#16A34A]' : ''
                    }`}
                  />
                  <span>
                    {approvalStatus === 'approved' ? 'Approved' : 'Review & Approve'}
                  </span>
                </Button>

                <div className="flex items-center gap-2 justify-end flex-wrap">
                  <Button type="button" variant="secondary" onClick={onClose}>
                    Close
                  </Button>

                  {selectedChannel === 'whatsapp_manual' ? (
                    <Button
                      type="button"
                      onClick={handleManualWhatsAppOpen}
                      disabled={!localConsent || approvalStatus !== 'approved' || !messageUrdu.trim()}
                      className="gap-1.5 bg-[#16A34A] hover:bg-green-700 text-white"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Open in WhatsApp</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      isLoading={isSending}
                      onClick={handleApiSend}
                      disabled={
                        !localConsent ||
                        approvalStatus !== 'approved' ||
                        !messagingSettings.auto_send_enabled ||
                        !channelEnabledByAdmin ||
                        !providerConfigured ||
                        !recipientValue
                      }
                      className="gap-1.5"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send via Official API</span>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};
