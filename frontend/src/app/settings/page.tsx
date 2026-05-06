"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings as SettingsIcon } from "lucide-react";

type Settings = {
    scraper_ac: string;
    theme: string;
    nsfw: string;
};

const SCRAPERS = [
    { value: "brave", label: "Brave" },
    { value: "ddg", label: "DuckDuckGo" },
    { value: "google", label: "Google" },
    { value: "yandex", label: "Yandex" },
    { value: "qwant", label: "Qwant" },
    { value: "startpage", label: "Startpage" },
    { value: "disabled", label: "Disabled" },
];

const THEMES = [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
    { value: "gruvbox", label: "Gruvbox" },
];

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings>({
        scraper_ac: "brave",
        theme: "dark",
        nsfw: "no",
    });
    const [saved, setSaved] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Load settings from cookies
        const cookies = document.cookie.split(";").reduce((acc, c) => {
            const [key, value] = c.trim().split("=");
            acc[key] = value;
            return acc;
        }, {} as Record<string, string>);

        setSettings({
            scraper_ac: cookies.scraper_ac || "brave",
            theme: cookies.theme || "dark",
            nsfw: cookies.nsfw || "no",
        });
    }, []);

    const saveSettings = () => {
        const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();

        Object.entries(settings).forEach(([key, value]) => {
            document.cookie = `${key}=${value}; expires=${expires}; path=/`;
        });

        // Apply theme immediately for instant feedback
        document.documentElement.setAttribute("data-theme", settings.theme);

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);

        // Refresh server components to ensure they verify the new cookies
        router.refresh();
    };

    return (


        <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans">
            {/* Header */}
            <header className="sticky top-0 z-20 backdrop-blur-md bg-[var(--background-2)]/90 border-b border-[var(--border)] shadow-md">
                <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
                    <a href="/" className="flex items-center pt-1">
                        <img src="/logo.svg" alt="Sorvx Logo" className="h-[52px] w-auto" />
                    </a>
                    <nav className="flex items-center gap-3 text-sm text-[var(--muted)]">
                        <a href="/" className="px-3 py-1.5 rounded-full hover:text-[var(--foreground)] transition-colors">Home</a>
                        <span className="px-3 py-1.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] shadow-sm flex items-center gap-2 font-medium">
                            <SettingsIcon size={14} /> Settings
                        </span>
                    </nav>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
                <div className="relative group rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4 sm:p-8 shadow-2xl overflow-hidden">
                    {/* Glow effect */}
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-[var(--accent)]/10 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-12 w-12 rounded-2xl bg-[var(--background-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shadow-lg">
                                <SettingsIcon size={22} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">Settings</h1>
                                <p className="text-sm text-[var(--muted)]">Tune your search experience and privacy defaults.</p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            {/* Autocomplete Scraper */}
                            <div className="rounded-xl bg-[var(--background)]/50 border border-[var(--border)] p-5 transition hover:border-[var(--muted)]/30">
                                <label className="block text-sm font-semibold mb-2.5 text-[var(--foreground)]">Autocomplete Provider</label>
                                <div className="relative">
                                    <select
                                        value={settings.scraper_ac}
                                        onChange={(e) => setSettings({ ...settings, scraper_ac: e.target.value })}
                                        className="w-full appearance-none bg-[var(--background-2)] border border-[var(--border)] rounded-lg px-4 py-3 sm:py-2.5 text-base sm:text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all cursor-pointer"
                                    >
                                        {SCRAPERS.map((s) => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted)]">
                                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-xs text-[var(--muted)] mt-2.5">Choose which search engine powers autocomplete suggestions.</p>
                            </div>

                            {/* Theme */}
                            <div className="rounded-xl bg-[var(--background)]/50 border border-[var(--border)] p-5 transition hover:border-[var(--muted)]/30">
                                <label className="block text-sm font-semibold mb-2.5 text-[var(--foreground)]">Theme</label>
                                <div className="relative">
                                    <select
                                        value={settings.theme}
                                        onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                                        className="w-full appearance-none bg-[var(--background-2)] border border-[var(--border)] rounded-lg px-4 py-3 sm:py-2.5 text-base sm:text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all cursor-pointer"
                                    >
                                        {THEMES.map((t) => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted)]">
                                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* NSFW */}
                            <div className="rounded-xl bg-[var(--background)]/50 border border-[var(--border)] p-5 transition hover:border-[var(--muted)]/30">
                                <label className="block text-sm font-semibold mb-2.5 text-[var(--foreground)]">NSFW Content</label>
                                <div className="relative">
                                    <select
                                        value={settings.nsfw}
                                        onChange={(e) => setSettings({ ...settings, nsfw: e.target.value })}
                                        className="w-full appearance-none bg-[var(--background-2)] border border-[var(--border)] rounded-lg px-4 py-3 sm:py-2.5 text-base sm:text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all cursor-pointer"
                                    >
                                        <option value="yes">Show</option>
                                        <option value="no">Hide</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted)]">
                                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
                            <p className="text-sm text-[var(--muted)]">Saved to cookies for one year.</p>
                            <button
                                onClick={saveSettings}
                                className="px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white text-sm font-semibold shadow-lg shadow-purple-500/25 transition-all transform active:scale-95"
                            >
                                {saved ? "✓ Saved!" : "Save Settings"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
