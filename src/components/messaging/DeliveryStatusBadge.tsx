import React from 'react';
import type { MessageApprovalStatus, MessageDeliveryStatus } from '../../types/database';

const DELIVERY_META: Record<
  MessageDeliveryStatus,
  { label: string; cls: string }
> = {
  draft: {
    label: 'Draft',
    cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  ready_for_manual_send: {
    label: 'Approved (Ready)',
    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  },
  opened_in_whatsapp: {
    label: 'Opened in WhatsApp (Manual)',
    cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  queued: {
    label: 'Queued by Provider',
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  },
  sent: {
    label: 'Sent (Confirmed)',
    cls: 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300',
  },
  delivered: {
    label: 'Delivered',
    cls: 'bg-[#16A34A] text-white',
  },
  failed: {
    label: 'Failed',
    cls: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
  },
  blocked: {
    label: 'Blocked (Safety)',
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  },
};

export const DeliveryStatusBadge: React.FC<{ status: MessageDeliveryStatus }> = ({
  status,
}) => {
  const meta = DELIVERY_META[status] || DELIVERY_META.draft;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
};

export const ApprovalStatusBadge: React.FC<{ status: MessageApprovalStatus }> = ({
  status,
}) => {
  const map: Record<MessageApprovalStatus, { label: string; cls: string }> = {
    draft: {
      label: 'Pending Review',
      cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    },
    approved: {
      label: 'Approved',
      cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    },
    rejected: {
      label: 'Rejected',
      cls: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
    },
  };
  const meta = map[status] || map.draft;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
};
