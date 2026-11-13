import React, { useEffect, useState } from 'react';
import { settingsService, DEFAULT_MESSAGE_TEMPLATE } from '../../services/settingsService';
import { statusesService } from '../../services/statusesService';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { AdminNav } from '../../components/admin/AdminNav';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ColorPicker, DEFAULT_COLOR_SWATCHES } from '../../components/ui/ColorPicker';
import type { DefaultStatus } from '../../types/database';
import { Upload, Plus, Trash2, BookOpenCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AdminSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { refreshAppSettings } = useSettings();

  const [appName, setAppName] = useState('Hazri Book');
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [language, setLanguage] = useState<'en' | 'ur'>('en');
  const [template, setTemplate] = useState(DEFAULT_MESSAGE_TEMPLATE);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [defaultStatuses, setDefaultStatuses] = useState<DefaultStatus[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [appSet, defStatuses] = await Promise.all([
          settingsService.getAppSettings(),
          statusesService.getDefaultStatuses(),
        ]);
        setAppName(appSet.app_name);
        setPrimaryColor(appSet.primary_color);
        setLanguage(appSet.default_language);
        setTemplate(appSet.default_message_template || DEFAULT_MESSAGE_TEMPLATE);
        setLogoUrl(appSet.logo_url);
        setDefaultStatuses(defStatuses);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const publicUrl = await settingsService.uploadLogo(file);
      setLogoUrl(publicUrl);
      await settingsService.updateAppSettings({ logo_url: publicUrl });
      await refreshAppSettings();
      showToast('App logo uploaded!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload logo', 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleAddDefaultStatus = () => {
    setDefaultStatuses((prev) => [
      ...prev,
      {
        id: `def_new_${Date.now()}`,
        key: `custom_${Date.now()}`,
        label_en: 'Excused',
        label_ur: 'عذر',
        color: '#7C3AED',
        counts_as_present: true,
        notify_parents: false,
        sort_order: prev.length + 1,
      },
    ]);
  };

  const handleUpdateDefaultStatus = (idx: number, patch: Partial<DefaultStatus>) => {
    setDefaultStatuses((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item))
    );
  };

  const handleRemoveDefaultStatus = (idx: number) => {
    setDefaultStatuses((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await Promise.all([
        settingsService.updateAppSettings({
          app_name: appName.trim(),
          primary_color: primaryColor,
          default_language: language,
          default_message_template: template.trim() || null,
          logo_url: logoUrl,
        }),
        statusesService.saveDefaultStatuses(defaultStatuses),
      ]);
      await refreshAppSettings();
      showToast('Global settings saved!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save global settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <AdminNav
        title={t('admin.global_defaults')}
        subtitle="Applied as global fallbacks and initial defaults when new users register"
      />

      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-5 space-y-4">
          <h2 className="font-bold text-base text-[var(--color-text)]">
            Global Branding & New User Defaults
          </h2>

          <Input
            label="Default App Name"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            disabled={isLoading}
            required
          />

          {/* Logo Upload (bucket: app-assets) */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-2">
              Global App Logo
            </label>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl border border-[var(--color-border)] bg-primary/10 text-primary flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="App Logo" className="w-full h-full object-cover" />
                ) : (
                  <BookOpenCheck className="w-7 h-7" />
                )}
              </div>
              <label className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Upload className="w-4 h-4" />
                <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <ColorPicker
            label="Default Theme Color"
            value={primaryColor}
            swatches={DEFAULT_COLOR_SWATCHES}
            onChange={setPrimaryColor}
          />

          <div>
            <label
              htmlFor="admin-default-language"
              className="block text-xs font-semibold text-[var(--color-text)] mb-1.5"
            >
              Default Language
            </label>
            <select
              id="admin-default-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'ur')}
              className="min-h-[44px] px-3.5 py-2 text-sm font-semibold rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
            >
              <option value="en">English (LTR)</option>
              <option value="ur">اردو (Urdu RTL)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="admin-default-whatsapp"
              className="block text-xs font-semibold text-[var(--color-text)] mb-1.5"
            >
              Default WhatsApp Template
            </label>
            <textarea
              id="admin-default-whatsapp"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary min-h-[90px]"
              required
            />
          </div>
        </div>

        {/* Default Statuses Table (`default_statuses`) */}
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-base text-[var(--color-text)]">
                Default Status Template (New Users Only)
              </h2>
              <p className="text-xs text-[var(--color-muted)]">
                Cloned from <code className="font-mono">default_statuses</code> into each new user's attendance statuses upon signup
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddDefaultStatus}
              className="gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </Button>
          </div>

          <div className="space-y-2.5">
            {defaultStatuses.map((st, idx) => (
              <div
                key={st.id}
                className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
              >
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    aria-label="English status label"
                    value={st.label_en}
                    onChange={(e) =>
                      handleUpdateDefaultStatus(idx, {
                        label_en: e.target.value,
                        key: st.id.startsWith('def_new_')
                          ? e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_')
                          : st.key,
                      })
                    }
                    placeholder="English"
                    className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    aria-label="Urdu status label"
                    value={st.label_ur}
                    onChange={(e) =>
                      handleUpdateDefaultStatus(idx, { label_ur: e.target.value })
                    }
                    placeholder="Urdu"
                    className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-1.5">
                  <input
                    type="color"
                    aria-label="Status color"
                    value={st.color}
                    onChange={(e) =>
                      handleUpdateDefaultStatus(idx, { color: e.target.value.toUpperCase() })
                    }
                    className="w-9 h-9 rounded cursor-pointer border-0 bg-transparent shrink-0"
                  />
                  <input
                    type="text"
                    aria-label="Status hex code"
                    value={st.color}
                    onChange={(e) =>
                      handleUpdateDefaultStatus(idx, { color: e.target.value.toUpperCase() })
                    }
                    maxLength={7}
                    className="w-full min-h-[40px] px-2 text-xs font-mono rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
                  />
                </div>
                <div className="sm:col-span-3 flex items-center gap-3 text-xs font-semibold">
                  <label className="flex items-center gap-1.5 min-h-[44px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={st.counts_as_present}
                      onChange={(e) =>
                        handleUpdateDefaultStatus(idx, { counts_as_present: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <span>Present</span>
                  </label>
                  <label className="flex items-center gap-1.5 min-h-[44px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={st.notify_parents}
                      onChange={(e) =>
                        handleUpdateDefaultStatus(idx, { notify_parents: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <span>Notify</span>
                  </label>
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveDefaultStatus(idx)}
                    aria-label={`Remove ${st.label_en}`}
                    title="Remove"
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[#DC2626]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="lg" isLoading={isSaving}>
            Save Global Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
