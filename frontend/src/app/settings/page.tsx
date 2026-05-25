"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings as SettingsIcon, ChevronDown } from "lucide-react";

type Settings = {
  nsfw: string; theme: string; bg_noclick: string; scraper_ac: string; scraper_web: string;
  scraper_images: string; scraper_videos: string; scraper_news: string; scraper_music: string;
};

const CATEGORIES = [
  {
    name: "General",
    settings: [
      { param: "nsfw" as keyof Settings, label: "Allow NSFW content", options: [{ v: "yes", t: "Yes" }, { v: "maybe", t: "Maybe" }, { v: "no", t: "No" }] },
      { param: "theme" as keyof Settings, label: "Theme", options: [{ v: "dark", t: "Dark" }, { v: "light", t: "Light" }, { v: "gruvbox", t: "Gruvbox" }] },
      { param: "bg_noclick" as keyof Settings, label: "Prevent background click in image viewer", options: [{ v: "no", t: "No" }, { v: "yes", t: "Yes" }] },
    ],
  },
  {
    name: "Scrapers",
    settings: [
      {
        param: "scraper_ac" as keyof Settings, label: "Autocomplete",
        options: [{ v: "disabled", t: "Disabled" }, { v: "auto", t: "Auto" }, { v: "brave", t: "Brave" }, { v: "ddg", t: "DuckDuckGo" }, { v: "google", t: "Google" }, { v: "yandex", t: "Yandex" }, { v: "qwant", t: "Qwant" }, { v: "startpage", t: "Startpage" }, { v: "kagi", t: "Kagi" }, { v: "marginalia", t: "Marginalia" }],
      },
      {
        param: "scraper_web" as keyof Settings, label: "Web",
        options: [{ v: "ddg", t: "DuckDuckGo" }, { v: "brave", t: "Brave" }, { v: "google", t: "Google" }, { v: "yandex", t: "Yandex" }, { v: "qwant", t: "Qwant" }, { v: "startpage", t: "Startpage" }, { v: "mojeek", t: "Mojeek" }],
      },
      {
        param: "scraper_images" as keyof Settings, label: "Images",
        options: [{ v: "ddg", t: "DuckDuckGo" }, { v: "google", t: "Google" }, { v: "yandex", t: "Yandex" }, { v: "brave", t: "Brave" }, { v: "pixabay", t: "Pixabay" }, { v: "unsplash", t: "Unsplash" }],
      },
      {
        param: "scraper_videos" as keyof Settings, label: "Videos",
        options: [{ v: "yt", t: "YouTube" }, { v: "google", t: "Google" }, { v: "brave", t: "Brave" }, { v: "ddg", t: "DuckDuckGo" }, { v: "vimeo", t: "Vimeo" }],
      },
      {
        param: "scraper_news" as keyof Settings, label: "News",
        options: [{ v: "google", t: "Google" }, { v: "brave", t: "Brave" }, { v: "ddg", t: "DuckDuckGo" }, { v: "qwant", t: "Qwant" }],
      },
      {
        param: "scraper_music" as keyof Settings, label: "Music",
        options: [{ v: "sc", t: "SoundCloud" }],
      },
    ],
  },
];

const DEFAULTS: Settings = {
  nsfw: "no", theme: "dark", bg_noclick: "no",
  scraper_ac: "brave", scraper_web: "brave", scraper_images: "ddg",
  scraper_videos: "yt", scraper_news: "google", scraper_music: "sc",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const cookies = document.cookie.split(";").reduce((acc, c) => {
      const [key, value] = c.trim().split("=");
      if (key) acc[key] = decodeURIComponent(value);
      return acc;
    }, {} as Record<string, string>);
    setSettings(prev => ({ ...prev, ...Object.keys(prev).reduce((acc, key) => { if (cookies[key]) acc[key as keyof Settings] = cookies[key]; return acc; }, {} as Partial<Settings>) }));
  }, []);

  const save = () => {
    const expires = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toUTCString();
    Object.entries(settings).forEach(([k, v]) => document.cookie = `${k}=${encodeURIComponent(v)}; expires=${expires}; path=/; SameSite=Lax`);
    document.documentElement.setAttribute("data-theme", settings.theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  };

  const reset = () => {
    document.cookie.split(";").forEach(c => {
      const name = c.indexOf("=") > -1 ? c.substr(0, c.indexOf("=")).trim() : c.trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
    window.location.reload();
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <header className="sticky top-0 z-20 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-[var(--container)] mx-auto px-4 py-2.5 flex items-center justify-between">
          <a href="/"><img src="/logo.svg" alt="Sorvx" className="h-7 w-auto" /></a>
          <nav className="flex items-center gap-2 text-[13px] text-[var(--meta)]">
            <a href="/" className="px-3 py-1.5 rounded-[var(--radius-sm)] hover:text-[var(--fg)] transition-colors">Home</a>
            <span className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] text-[var(--fg)] flex items-center gap-1.5 font-medium"><SettingsIcon size={13} /> Settings</span>
          </nav>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <div className="size-11 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]"><SettingsIcon size={20} /></div>
          <div>
            <h1 className="text-xl font-medium text-[var(--fg)]">Settings</h1>
            <p className="text-[13px] text-[var(--meta)]">Tune your search experience and privacy defaults.</p>
          </div>
        </div>

        {CATEGORIES.map(cat => (
          <div key={cat.name} className="space-y-5">
            <h2 className="text-[15px] font-semibold text-[var(--fg)] border-b border-[var(--border)] pb-2">{cat.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cat.settings.map(s => (
                <div key={s.param} className="rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] p-3.5 transition-colors hover:border-[var(--accent)]/40">
                  <label className="block text-[13px] font-medium mb-2 text-[var(--fg)]">{s.label}</label>
                  <div className="relative">
                    <select
                      value={settings[s.param]}
                      onChange={e => setSettings({ ...settings, [s.param]: e.target.value })}
                      className="w-full appearance-none bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[13px] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] transition-all cursor-pointer"
                    >
                      {s.options.map(o => <option key={o.v} value={o.v}>{o.t}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--meta)]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[var(--border)]">
          <p className="text-[12px] text-[var(--meta)]">Settings are saved locally as cookies for 400 days.</p>
          <div className="flex gap-3 w-full sm:w-auto">
            <button onClick={reset} className="flex-1 sm:flex-none px-6 py-2.5 rounded-[var(--radius-sm)] bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[13px] font-medium border border-red-500/20 transition-all active:scale-95">Reset</button>
            <button onClick={save} className="flex-1 sm:flex-none px-6 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[13px] font-medium transition-all active:scale-95">{saved ? "Saved!" : "Save Settings"}</button>
          </div>
        </div>
      </div>
    </main>
  );
}
