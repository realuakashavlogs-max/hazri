import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useStatuses } from '../../hooks/useStatuses';
import { useToast } from '../../contexts/ToastContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ColorPicker, DEFAULT_COLOR_SWATCHES } from '../../components/ui/ColorPicker';
import {
  Palette,
  Moon,
  Sun,
  Globe,
  Plus,
  Trash2,
  Edit2,
  MessageSquare,
  User,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AttendanceStatus } from '../../types/database';

const STATUS_SWATCHES = [
  { name: 'Present Green', hex: '#16A34A' },
  { name: 'Absent Red', hex: '#DC2626' },
  { name: 'Late Amber', hex: '#F59E0B' },
  { name: 'Leave Purple', hex: '#7C3AED' },
  { name: 'Primary Blue', hex: '#2563EB' },
  { name: 'Teal', hex: '#0D9488' },
];

const CORE_STATUS_KEYS = new Set(['present', 'absent', 'late', 'leave']);

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateProfileName } = useAuth();
  const { showToast } = useToast();
  const {
    settings,
    appSettings,
    effectiveAppName,
    effectivePrimaryColor,
    effectiveLanguage,
    effectiveMessageTemplate,
    updateSettings,
    toggleDarkMode,
    toggleLanguage,
  } = useSettings();
  const {
    statuses,
    isReadOnly,
    createStatus,
    updateStatus,
    reorderStatuses,
    deleteStatus,
  } = useStatuses();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [appName, setAppName] = useState(settings.app_display_name || '');
  const [template, setTemplate] = useState(
    settings.message_template ?? appSettings.default_message_template ?? ''
  );

  useEffect(() => {
    setFullName(user?.full_name || '');
  }, [user?.full_name]);

  useEffect(() => {
    setAppName(settings.app_display_name || '');
    setTemplate(
      settings.message_template ?? appSettings.default_message_template ?? ''
    );
  }, [settings.app_display_name, settings.message_template, appSettings.default_message_template]);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<AttendanceStatus | null>(null);
  const [statusLabelEn, setStatusLabelEn] = useState('');
  const [statusLabelUr, setStatusLabelUr] = useState('');
  const [statusColor, setStatusColor] = useState('#7C3AED');
  const [statusCountsPresent, setStatusCountsPresent] = useState(false);
  const [statusNotifyParents, setStatusNotifyParents] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const handleOpenAddStatus = () => {
    setEditingStatus(null);
    setStatusLabelEn('');
    setStatusLabelUr('');
    setStatusColor('#7C3AED');
    setStatusCountsPresent(false);
    setStatusNotifyParents(false);
    setStatusError(null);
    setIsStatusModalOpen(true);
  };

  const handleOpenEditStatus = (st: AttendanceStatus) => {
    setEditingStatus(st);
    setStatusLabelEn(st.label_en);
    setStatusLabelUr(st.label_ur);
    setStatusColor(st.color);
    setStatusCountsPresent(st.counts_as_present);
    setStatusNotifyParents(Boolean(st.notify_parents));
    setStatusError(null);
    setIsStatusModalOpen(true);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusLabelEn.trim()) return;

    try {
      if (editingStatus) {
        await updateStatus({
          id: editingStatus.id,
          updates: {
            label_en: statusLabelEn.trim(),
            label_ur: statusLabelUr.trim() || statusLabelEn.trim(),
            color: statusColor,
            counts_as_present: statusCountsPresent,
            notify_parents: statusNotifyParents,
          },
        });
        showToast('Status updated!', 'success');
      } else {
        await createStatus({
          labelEn: statusLabelEn.trim(),
          labelUr: statusLabelUr.trim() || statusLabelEn.trim(),
          color: statusColor,
          countsAsPresent: statusCountsPresent,
          notifyParents: statusNotifyParents,
        });
        showToast('Status created!', 'success');
      }
      setIsStatusModalOpen(false);
    } catch (err: any) {
      setStatusError(err.message || 'Failed to save status');
    }
  };

  const handleMoveStatus = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= statuses.length) return;
    const reordered = [...statuses];
    const [item] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, item);
    try {
      await reorderStatuses(reordered);
      showToast('Status order updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to reorder statuses', 'error');
    }
  };

  const handleDeleteStatus = async (id: string) => {
    try {
      await deleteStatus(id);
      showToast('Status deleted', 'info');
    } catch (err: any) {
      showToast(err.message || 'Cannot delete status', 'error');
    }
  };

  const insertPlaceholder = (tag: string) => {
    const next = `${template} ${tag}`.trim();
    setTemplate(next);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-[22px] sm:text-2xl font-extrabold text-[var(--color-text)]">
          {t('settings.title')}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Personalize theme colors, language, custom attendance statuses, and WhatsApp templates
        </p>
      </div>

      {/* Admin Link Card inside Settings */}
      {user?.role === 'admin' && (
        <Link
          to="/admin"
          className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/60 p-4 flex items-center justify-between gap-3 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-[var(--color-text)]">
                  {t('settings.admin_panel')}
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                  {t('admin.badge')}
                </span>
              </div>
              <p className="text-xs text-[var(--color-muted)]">
                {t('settings.admin_panel_desc')}
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0 rtl:rotate-180" />
        </Link>
      )}

      {/* Profile & School Name Card */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-base text-[var(--color-text)] truncate">
              {user?.full_name || 'Educator Profile'}
            </h2>
            <p className="text-xs text-[var(--color-muted)] font-mono truncate">{user?.email}</p>
          </div>
        </div>

        <div className="pt-3 border-t border-[var(--color-border)] space-y-4">
          <div>
            <label
              htmlFor="profile-full-name"
              className="block text-xs font-semibold text-[var(--color-text)] mb-1.5"
            >
              {t('auth.full_name')}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="profile-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ustadh Ahmad"
                disabled={isReadOnly}
              />
              <Button
                onClick={async () => {
                  await updateProfileName(fullName.trim());
                  showToast('Profile name updated!', 'success');
                }}
                disabled={isReadOnly || !fullName.trim() || fullName.trim() === (user?.full_name || '')}
                className="shrink-0"
              >
                {t('common.save')}
              </Button>
            </div>
          </div>

          <div>
            <label
              htmlFor="app-display-name"
              className="block text-xs font-semibold text-[var(--color-text)] mb-1.5"
            >
              {t('settings.app_name')}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="app-display-name"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder={`Default: ${appSettings.app_name}`}
                disabled={isReadOnly}
              />
              <Button
                onClick={async () => {
                  await updateSettings({ app_display_name: appName.trim() || null });
                  showToast('App display name saved!', 'success');
                }}
                disabled={isReadOnly || (appName.trim() || null) === settings.app_display_name}
                className="shrink-0"
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance & Theme Card */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-base text-[var(--color-text)] flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <span>Appearance & Theme</span>
          </h2>
          {settings.primary_color && !isReadOnly && (
            <button
              type="button"
              onClick={async () => {
                await updateSettings({ primary_color: null });
                showToast('Reset to global default color', 'info');
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-muted)] hover:text-primary"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Use global default</span>
            </button>
          )}
        </div>

        <ColorPicker
          label={t('settings.primary_color')}
          value={effectivePrimaryColor}
          swatches={DEFAULT_COLOR_SWATCHES}
          disabled={isReadOnly}
          onChange={async (hex) => {
            await updateSettings({ primary_color: hex });
            showToast('Theme color updated!', 'success');
          }}
        />

        <div className="pt-3 border-t border-[var(--color-border)] flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {settings.dark_mode ? (
                <Moon className="w-4 h-4 text-primary" />
              ) : (
                <Sun className="w-4 h-4 text-[#F59E0B]" />
              )}
              <span className="text-sm font-bold text-[var(--color-text)]">
                {t('settings.dark_mode')}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.dark_mode}
              aria-label={t('settings.dark_mode')}
              onClick={toggleDarkMode}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-150 ${
                settings.dark_mode ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-150 ${
                  settings.dark_mode ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-[var(--color-text)]">
                {t('settings.language')}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={toggleLanguage}>
              {effectiveLanguage === 'ur' ? 'اردو (Urdu RTL)' : 'English (LTR)'}
            </Button>
          </div>
        </div>
      </div>

      {/* Custom Status Types Manager */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-base text-[var(--color-text)]">
              {t('settings.custom_statuses')}
            </h2>
            <p className="text-xs text-[var(--color-muted)]">
              Create, rename, reorder, recolor, and configure parent notification rules
            </p>
          </div>

          {!isReadOnly && (
            <Button size="sm" onClick={handleOpenAddStatus} className="gap-1.5 shrink-0">
              <Plus className="w-4 h-4" />
              <span>{t('settings.add_status')}</span>
            </Button>
          )}
        </div>

        <div className="space-y-2.5">
          {statuses.map((st, idx) => {
            const isCore = CORE_STATUS_KEYS.has(st.key);
            return (
              <div
                key={st.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] gap-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: st.color }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[var(--color-text)]">
                        {st.label_en}
                      </span>
                      <span className="text-xs text-[var(--color-muted)] font-urdu">
                        ({st.label_ur})
                      </span>
                      {st.notify_parents && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#16A34A]/10 text-[#16A34A]">
                          WhatsApp Notify
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        st.counts_as_present ? 'text-[#16A34A]' : 'text-[#DC2626]'
                      }`}
                    >
                      {st.counts_as_present ? 'Counts as Present' : 'Does not count as Present'}
                    </span>
                  </div>
                </div>

                {!isReadOnly && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveStatus(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Move ${st.label_en} up`}
                      title="Move Up"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[var(--color-text)] disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveStatus(idx, 1)}
                      disabled={idx === statuses.length - 1}
                      aria-label={`Move ${st.label_en} down`}
                      title="Move Down"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[var(--color-text)] disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditStatus(st)}
                      aria-label={`Edit ${st.label_en}`}
                      title="Edit"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[var(--color-text)]"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!isCore && (
                      <button
                        type="button"
                        onClick={() => handleDeleteStatus(st.id)}
                        aria-label={`Delete ${st.label_en}`}
                        title="Delete"
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[#DC2626]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* WhatsApp Message Template Card */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-5 space-y-3">
        <h2 className="font-bold text-base text-[var(--color-text)] flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#16A34A]" />
          <span>{t('settings.whatsapp_template')}</span>
        </h2>
        <p className="text-xs text-[var(--color-muted)]">
          Tap a placeholder to insert it into the message template:
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {['{student_name}', '{class_name}', '{status}', '{date}', '{app_name}'].map(
            (ph) => (
              <button
                key={ph}
                type="button"
                onClick={() => insertPlaceholder(ph)}
                disabled={isReadOnly}
                className="px-3 min-h-[40px] rounded-xl text-xs font-mono font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                {ph}
              </button>
            )
          )}
        </div>

        <textarea
          aria-label={t('settings.whatsapp_template')}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          disabled={isReadOnly}
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary min-h-[96px]"
        />

        <div className="flex justify-end gap-2">
          {settings.message_template && !isReadOnly && (
            <Button
              variant="outline"
              size="md"
              onClick={async () => {
                await updateSettings({ message_template: null });
                showToast('Reset to global default template', 'info');
              }}
            >
              Reset Default
            </Button>
          )}
          <Button
            size="md"
            onClick={async () => {
              await updateSettings({ message_template: template.trim() || null });
              showToast('WhatsApp template saved!', 'success');
            }}
            disabled={isReadOnly || (template.trim() || null) === settings.message_template}
          >
            {t('common.save')}
          </Button>
        </div>

        <div className="pt-2 border-t border-[var(--color-border)]">
          <span className="text-xs font-bold text-[var(--color-muted)] mb-1.5 block">
            {t('settings.preview')}:
          </span>
          <div className="p-3.5 bg-[var(--color-bg)] rounded-xl text-sm text-[var(--color-text)] leading-relaxed border border-[var(--color-border)]">
            {(template || effectiveMessageTemplate)
              .replace(/{student_name}/g, 'Muhammad Ali')
              .replace(/{class_name}/g, 'Class 5 - Green')
              .replace(/{status}/g, 'Absent (غائب)')
              .replace(/{date}/g, '2026-11-13')
              .replace(/{app_name}/g, effectiveAppName)}
          </div>
        </div>
      </div>

      {/* Add / Edit Custom Status Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={editingStatus ? 'Edit Status' : t('settings.add_status')}
      >
        <form onSubmit={handleSaveStatus} className="space-y-4">
          {statusError && (
            <div className="p-3 bg-red-50 text-[#DC2626] text-xs rounded-xl">
              {statusError}
            </div>
          )}

          <Input
            label="English Label *"
            placeholder="e.g. Excused, Medical, Duty"
            value={statusLabelEn}
            onChange={(e) => setStatusLabelEn(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Urdu Label (اردو نام)"
            placeholder="e.g. عذر، رخصت بیماری"
            value={statusLabelUr}
            onChange={(e) => setStatusLabelUr(e.target.value)}
          />

          <ColorPicker
            label="Status Color"
            value={statusColor}
            swatches={STATUS_SWATCHES}
            onChange={setStatusColor}
          />

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
              <input
                type="checkbox"
                checked={statusCountsPresent}
                onChange={(e) => setStatusCountsPresent(e.target.checked)}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
              <span className="text-sm font-semibold text-[var(--color-text)]">
                Count as Present towards Attendance % Rate
              </span>
            </label>

            <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
              <input
                type="checkbox"
                checked={statusNotifyParents}
                onChange={(e) => setStatusNotifyParents(e.target.checked)}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
              <span className="text-sm font-semibold text-[var(--color-text)]">
                {t('settings.notify_parents_toggle')}
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsStatusModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
