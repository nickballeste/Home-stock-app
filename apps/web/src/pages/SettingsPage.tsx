import { useEffect, useState } from 'react';
import { useSettings, useUpdateSettings } from '../api/queries';
import { Input } from '../components/Input';
import Button from '../components/Button';

export default function SettingsPage() {
  const { data: settings } = useSettings();
  const update = useUpdateSettings();

  const [thresholdDays, setThresholdDays] = useState(3);
  const [digestEmailTime, setDigestEmailTime] = useState('08:00');
  const [digestEmailAddress, setDigestEmailAddress] = useState('');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');

  useEffect(() => {
    if (settings) {
      setThresholdDays(settings.defaultAlertThresholdDays);
      setDigestEmailTime(settings.digestEmailTime);
      setDigestEmailAddress(settings.digestEmailAddress);
      setTimezone(settings.timezone);
    }
  }, [settings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await update.mutateAsync({
      defaultAlertThresholdDays: thresholdDays,
      digestEmailTime,
      digestEmailAddress,
      timezone,
    });
  }

  return (
    <div className="max-w-xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <Input
          label="Default alert threshold (days)"
          type="number"
          min={0}
          max={60}
          value={thresholdDays}
          onChange={(e) => setThresholdDays(Number(e.target.value))}
          hint="Per-product overrides take precedence over this default."
        />
        <Input
          label="Digest email time"
          type="time"
          value={digestEmailTime}
          onChange={(e) => setDigestEmailTime(e.target.value)}
        />
        <Input
          label="Digest email recipient"
          type="email"
          value={digestEmailAddress}
          onChange={(e) => setDigestEmailAddress(e.target.value)}
        />
        <Input
          label="Timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          hint="IANA timezone, e.g. America/Sao_Paulo"
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
        {update.isSuccess && <p className="text-xs text-emerald-700">Settings saved.</p>}
      </form>
    </div>
  );
}
