"use client";

import { useState, useEffect } from "react";

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

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <main className="min-h-screen bg-[#1a1a1a] text-[#e8e6e3]">
            {/* Header */}
            <header className="sticky top-0 bg-[#1a1a1a] border-b border-[#333] z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <a href="/" className="text-xl font-bold">Sorvx</a>
                    <nav className="flex gap-4 text-sm">
                        <a href="/" className="text-[#888] hover:text-white">Home</a>
                        <span className="text-white">Settings</span>
                    </nav>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-6">Settings</h1>

                <div className="space-y-6">
                    {/* Autocomplete Scraper */}
                    <div className="bg-[#2a2a2a] border border-[#444] rounded-md p-4">
                        <label className="block text-sm font-medium mb-2">Autocomplete Provider</label>
                        <select
                            value={settings.scraper_ac}
                            onChange={(e) => setSettings({ ...settings, scraper_ac: e.target.value })}
                            className="w-full bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#888]"
                        >
                            {SCRAPERS.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                        <p className="text-xs text-[#888] mt-2">Choose which search engine provides autocomplete suggestions.</p>
                    </div>

                    {/* Theme */}
                    <div className="bg-[#2a2a2a] border border-[#444] rounded-md p-4">
                        <label className="block text-sm font-medium mb-2">Theme</label>
                        <select
                            value={settings.theme}
                            onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                            className="w-full bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#888]"
                        >
                            {THEMES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* NSFW */}
                    <div className="bg-[#2a2a2a] border border-[#444] rounded-md p-4">
                        <label className="block text-sm font-medium mb-2">NSFW Content</label>
                        <select
                            value={settings.nsfw}
                            onChange={(e) => setSettings({ ...settings, nsfw: e.target.value })}
                            className="w-full bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#888]"
                        >
                            <option value="yes">Show</option>
                            <option value="no">Hide</option>
                        </select>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={saveSettings}
                        className="bg-[#3a3a3a] hover:bg-[#444] border border-[#444] rounded px-6 py-2 text-sm transition-colors"
                    >
                        {saved ? "✓ Saved!" : "Save Settings"}
                    </button>
                </div>
            </div>
        </main>
    );
}
