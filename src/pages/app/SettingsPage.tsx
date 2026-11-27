import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { Link } from 'react-router-dom';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useMessagingSettings } from '../../hooks/useMessaging';
import { FIXED_STATUSES } from '../../lib/statuses';
import { DEFAULT_LOCAL_SETTINGS } from '../../services/settingsService';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ColorPicker, DEFAULT_COLOR_SWATCHES } from '../../components/ui/ColorPicker';
import {
  Palette,
  Moon,
  Sun,
  Globe,
  MessageSquare,
  User,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { settings: messagingSettings } = useMessagingSettings();
  const {
    settings,
    effectiveAppName,
    effectivePrimaryColor,
    effectiveLanguage,
    effectiveMessageTemplate,
    updateSettings,
    toggleDarkMode,
    toggleLanguage,
  } = useSettings();

  const [appName, setAppName] = useState(settings.app_display_name || 'Hazri Book');
  const [template, setTemplate] = useState(
    settings.message_template || DEFAULT_LOCAL_SETTINGS.message_template
  );
  const [whatsappConfig, setWhatsappConfig] = useState<{ configured: boolean; appId: string; configId: string } | null>(null);
  const [whatsappConnection, setWhatsappConnection] = useState<any>(null);
  const [whatsappBusy, setWhatsappBusy] = useState(false);

  useEffect(() => {
    setAppName(settings.app_display_name || 'Hazri Book');
    setTemplate(settings.message_template || DEFAULT_LOCAL_SETTINGS.message_template);
  }, [settings.app_display_name, settings.message_template]);

  useEffect(() => {
    let active = true;
    const loadWhatsAppConnection = async () => {
      if (!isSupabaseConfigured || !supabase) return;
      const [configResult, statusResult] = await Promise.all([
        supabase.functions.invoke('whatsapp-connect', { body: { action: 'config' } }),
        supabase.functions.invoke('whatsapp-connect', { body: { action: 'status' } }),
      ]);
      if (!active) return;
      if (!configResult.error && configResult.data) setWhatsappConfig(configResult.data);
      if (!statusResult.error && statusResult.data) setWhatsappConnection(statusResult.data.connection || null);
    };
    void loadWhatsAppConnection();
    return () => { active = false; };
  }, []);

  const connectWhatsAppBusiness = async () => {
    if (!whatsappConfig?.configured || !whatsappConfig.appId || !whatsappConfig.configId || !supabase) {
      showToast('WhatsApp Business connection has not been configured by Hazri yet.', 'error');
      return;
    }
    setWhatsappBusy(true);
    try {
      const w = window as any;
      if (!w.FB) {
        await new Promise<void>((resolve, reject) => {
          w.fbAsyncInit = () => {
            w.FB.init({ appId: whatsappConfig.appId, cookie: true, xfbml: false, version: 'v27.0' });
            resolve();
          };
          const script = document.createElement('script');
          script.src = 'https://connect.facebook.net/en_US/sdk.js';
          script.async = true;
          script.onerror = () => reject(new Error('Could not load Meta login. Please allow Facebook scripts and try again.'));
          document.body.appendChild(script);
        });
      } else {
        w.FB.init({ appId: whatsappConfig.appId, cookie: true, xfbml: false, version: 'v27.0' });
      }

      let finishSignup: ((value: any) => void) | null = null;
      let failSignup: ((reason: Error) => void) | null = null;
      const signupInfoPromise = new Promise<any>((resolve, reject) => {
        finishSignup = resolve;
        failSignup = reject;
        const listener = (event: MessageEvent) => {
          if (!event.origin.endsWith('facebook.com')) return;
          try {
            const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            if (payload?.type !== 'WA_EMBEDDED_SIGNUP') return;
            if (payload.event === 'FINISH') resolve(payload.data || {});
            if (payload.event === 'CANCEL') reject(new Error('WhatsApp Business connection was cancelled.'));
            if (payload.event === 'ERROR') reject(new Error(payload.data?.error_message || 'Meta could not complete WhatsApp setup.'));
          } catch { /* Ignore unrelated Meta SDK messages. */ }
        };
        window.addEventListener('message', listener);
        window.setTimeout(() => {
          window.removeEventListener('message', listener);
          reject(new Error('WhatsApp signup timed out. Please try again.'));
        }, 120000);
      });
      const loginResponse = await new Promise<any>((resolve) => {
        w.FB.login(resolve, {
          config_id: whatsappConfig.configId,
          response_type: 'code',
          override_default_response_type: true,
          extras: { setup: {} },
        });
      });
      const code = loginResponse?.authResponse?.code;
      if (!code) {
        if (failSignup) failSignup(new Error('Meta login did not return an authorization code.'));
        throw new Error('Meta login was not completed.');
      }
      const signupInfo = await signupInfoPromise;
      if (!signupInfo?.waba_id || !signupInfo?.phone_number_id) {
        throw new Error('Meta did not return the WhatsApp Business account and phone number details.');
      }
      const { data, error } = await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'exchange', code, wabaId: signupInfo.waba_id, phoneNumberId: signupInfo.phone_number_id },
      });
      if (error || !data?.connected) throw new Error(data?.error || error?.message || 'Could not save WhatsApp Business connection.');
      setWhatsappConnection(data.connection);
      showToast('WhatsApp Business connected successfully!', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'WhatsApp connection failed.', 'error');
    } finally {
      setWhatsappBusy(false);
    }
  };

  const disconnectWhatsAppBusiness = async () => {
    if (!supabase) return;
    setWhatsappBusy(true);
    try {
      const { error } = await supabase.functions.invoke('whatsapp-connect', { body: { action: 'disconnect' } });
      if (error) throw error;
      setWhatsappConnection(null);
      showToast('WhatsApp Business disconnected.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not disconnect WhatsApp.', 'error');
    } finally {
      setWhatsappBusy(false);
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
          Personalize theme colors, dark mode, language, and WhatsApp message template
        </p>
      </div>

      {/* Teacher Account & Display Name Card */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-base text-[var(--color-text)] truncate">
              {user?.full_name || 'Teacher Account'}
            </h2>
            <p className="text-xs text-[var(--color-muted)] font-mono truncate">{user?.email}</p>
          </div>
        </div>

        <div className="pt-3 border-t border-[var(--color-border)]">
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
              placeholder="Hazri Book"
            />
            <Button
              onClick={() => {
                updateSettings({ app_display_name: appName.trim() || 'Hazri Book' });
                showToast('App display name saved!', 'success');
              }}
              disabled={(appName.trim() || 'Hazri Book') === settings.app_display_name}
              className="shrink-0"
            >
              {t('common.save')}
            </Button>
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
          {settings.primary_color !== DEFAULT_LOCAL_SETTINGS.primary_color && (
            <button
              type="button"
              onClick={() => {
                updateSettings({ primary_color: DEFAULT_LOCAL_SETTINGS.primary_color });
                showToast('Reset to default color', 'info');
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-muted)] hover:text-primary"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset default</span>
            </button>
          )}
        </div>

        <ColorPicker
          label={t('settings.primary_color')}
          value={effectivePrimaryColor}
          swatches={DEFAULT_COLOR_SWATCHES}
          onChange={(hex) => {
            updateSettings({ primary_color: hex });
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

      {/* Fixed Attendance Status Legend */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-5 space-y-3">
        <h2 className="font-bold text-base text-[var(--color-text)]">
          {t('settings.attendance_statuses')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {FIXED_STATUSES.map((st) => (
            <div
              key={st.key}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-bold"
              style={{
                backgroundColor: `${st.color}14`,
                borderColor: `${st.color}45`,
                color: st.color,
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: st.color }}
              />
              <span className="truncate">
                {st.label_en} • {st.label_ur}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Teacher-owned WhatsApp Business connection */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-bold text-base text-[var(--color-text)] flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#16A34A]" />
              <span>اپنا WhatsApp Business کنیکٹ کریں</span>
            </h2>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              غیر حاضری کے پیغامات آپ کے اپنے منسلک WhatsApp Business نمبر سے والدین کو بھیجے جائیں گے۔
            </p>
          </div>
          <span className={whatsappConnection ? 'text-xs font-bold text-[#16A34A]' : 'text-xs font-bold text-amber-600'}>
            {whatsappConnection ? 'Connected' : 'Not connected'}
          </span>
        </div>
        {whatsappConnection ? (
          <div className="rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] p-3 space-y-1">
            <p className="text-sm font-bold text-[var(--color-text)]">{whatsappConnection.verified_name || 'WhatsApp Business'}</p>
            <p className="text-sm text-[var(--color-muted)]" dir="ltr">{whatsappConnection.display_phone_number || 'Connected number'}</p>
            <Button variant="outline" size="md" disabled={whatsappBusy} onClick={disconnectWhatsAppBusiness}>Disconnect WhatsApp</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button size="md" disabled={whatsappBusy || !whatsappConfig?.configured} onClick={connectWhatsAppBusiness}>
              {whatsappBusy ? 'Connecting…' : 'Connect with Meta / Facebook'}
            </Button>
            {!whatsappConfig?.configured && (
              <p className="text-xs text-amber-600">
                Meta Embedded Signup ابھی Hazri کے Meta App credentials اور Configuration ID کا منتظر ہے۔ یہ سرور پر محفوظ طریقے سے سیٹ ہونے کے بعد بٹن فعال ہو جائے گا۔
              </p>
            )}
            <p className="text-xs text-[var(--color-muted)]">
              اپنا WhatsApp Business اکاؤنٹ Meta کے محفوظ صفحے پر خود منتخب اور منظور کریں۔ Hazri آپ کا Facebook یا WhatsApp پاس ورڈ نہیں دیکھتا۔
            </p>
          </div>
        )}
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
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary min-h-[96px]"
        />

        <div className="flex justify-end gap-2">
          {settings.message_template !== DEFAULT_LOCAL_SETTINGS.message_template && (
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                updateSettings({
                  message_template: DEFAULT_LOCAL_SETTINGS.message_template,
                });
                showToast('Reset to default template', 'info');
              }}
            >
              Reset Default
            </Button>
          )}
          <Button
            size="md"
            onClick={() => {
              updateSettings({
                message_template:
                  template.trim() || DEFAULT_LOCAL_SETTINGS.message_template,
              });
              showToast('WhatsApp template saved!', 'success');
            }}
            disabled={
              (template.trim() || DEFAULT_LOCAL_SETTINGS.message_template) ===
              settings.message_template
            }
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
              .replace(/{class_name}/g, 'Class 5')
              .replace(/{status}/g, 'Absent (غائب)')
              .replace(/{date}/g, '2026-11-13')
              .replace(/{app_name}/g, effectiveAppName)}
          </div>
        </div>
      </div>

      {/* AI Parent Messaging & Safety Controls Link */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-bold text-base text-[var(--color-text)] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span>AI Parent Messaging &amp; Auto-Send Safety</span>
          </h2>
          <p className="text-xs text-[var(--color-muted)]">
            Automatic API Sending:{' '}
            <strong className={messagingSettings.auto_send_enabled ? 'text-[#16A34A]' : 'text-amber-600'}>
              {messagingSettings.auto_send_enabled ? 'Enabled by Admin' : 'Disabled by Admin'}
            </strong>{' '}
            • Review Urdu drafts, parent consent, and official WhatsApp/Telegram/SMS/Email API status.
          </p>
        </div>
        <Link
          to="/messages"
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-primary text-white text-xs sm:text-sm font-bold shrink-0 hover:opacity-95 transition-opacity"
        >
          <span>Open Messaging Controls</span>
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </Link>
      </div>
    </div>
  );
};
