"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings as SettingsIcon } from "lucide-react";

type Settings = {
    nsfw: string;
    theme: string;
    bg_noclick: string;
    scraper_ac: string;
    scraper_web: string;
    scraper_images: string;
    scraper_videos: string;
    scraper_news: string;
    scraper_music: string;
};

const SETTINGS_CONFIG = [
    {
        name: "General",
        settings: [
            {
                description: "Allow NSFW content",
                parameter: "nsfw" as keyof Settings,
                options: [
                    { value: "yes", text: "Yes" },
                    { value: "maybe", text: "Maybe" },
                    { value: "no", text: "No" }
                ]
            },
            {
                description: "Theme",
                parameter: "theme" as keyof Settings,
                options: [
                    { value: "dark", text: "Dark" },
                    { value: "light", text: "Light" },
                    { value: "gruvbox", text: "Gruvbox" }
                ]
            },
            {
                description: "Prevent clicking background elements when image viewer is open",
                parameter: "bg_noclick" as keyof Settings,
                options: [
                    { value: "no", text: "No" },
                    { value: "yes", text: "Yes" }
                ]
            }
        ]
    },
    {
        name: "Scrapers to use",
        settings: [
            {
                description: "Autocomplete",
                parameter: "scraper_ac" as keyof Settings,
                options: [
                    { value: "disabled", text: "Disabled" },
                    { value: "auto", text: "Auto" },
                    { value: "brave", text: "Brave" },
                    { value: "ddg", text: "DuckDuckGo" },
                    { value: "yandex", text: "Yandex" },
                    { value: "google", text: "Google" },
                    { value: "startpage", text: "Startpage" },
                    { value: "kagi", text: "Kagi" },
                    { value: "qwant", text: "Qwant" },
                    { value: "ghostery", text: "Ghostery" },
                    { value: "yep", text: "Yep" },
                    { value: "marginalia", text: "Marginalia" },
                    { value: "yt", text: "YouTube" },
                    { value: "sc", text: "SoundCloud" }
                ]
            },
            {
                description: "Web",
                parameter: "scraper_web" as keyof Settings,
                options: [
                    { value: "ddg", text: "DuckDuckGo" },
                    { value: "brave", text: "Brave" },
                    { value: "yandex", text: "Yandex" },
                    { value: "google", text: "Google" },
                    { value: "google_api", text: "Google API" },
                    { value: "google_cse", text: "Google CSE" },
                    { value: "yahoo_japan", text: "Yahoo! JAPAN" },
                    { value: "startpage", text: "Startpage" },
                    { value: "qwant", text: "Qwant" },
                    { value: "ghostery", text: "Ghostery" },
                    { value: "yep", text: "Yep" },
                    { value: "mwmbl", text: "Mwmbl" },
                    { value: "mojeek", text: "Mojeek" },
                    { value: "baidu", text: "Baidu" },
                    { value: "coccoc", text: "Cốc Cốc" },
                    { value: "solofield", text: "Solofield" },
                    { value: "marginalia", text: "Marginalia" },
                    { value: "wiby", text: "wiby" }
                ]
            },
            {
                description: "Images",
                parameter: "scraper_images" as keyof Settings,
                options: [
                    { value: "ddg", text: "DuckDuckGo" },
                    { value: "yandex", text: "Yandex" },
                    { value: "brave", text: "Brave" },
                    { value: "google", text: "Google" },
                    { value: "google_api", text: "Google API" },
                    { value: "google_cse", text: "Google CSE" },
                    { value: "yahoo_japan", text: "Yahoo! JAPAN" },
                    { value: "startpage", text: "Startpage" },
                    { value: "qwant", text: "Qwant" },
                    { value: "baidu", text: "Baidu" },
                    { value: "solofield", text: "Solofield" },
                    { value: "pinterest", text: "Pinterest" },
                    { value: "cara", text: "Cara" },
                    { value: "flickr", text: "Flickr" },
                    { value: "pexels", text: "Pexels" },
                    { value: "pixabay", text: "Pixabay" },
                    { value: "unsplash", text: "Unsplash" },
                    { value: "fivehpx", text: "500px" },
                    { value: "vsco", text: "VSCO" },
                    { value: "imgur", text: "Imgur" },
                    { value: "ftm", text: "FindThatMeme" }
                ]
            },
            {
                description: "Videos",
                parameter: "scraper_videos" as keyof Settings,
                options: [
                    { value: "yt", text: "YouTube" },
                    { value: "vimeo", text: "Vimeo" },
                    { value: "sepiasearch", text: "Sepia Search" },
                    { value: "ddg", text: "DuckDuckGo" },
                    { value: "brave", text: "Brave" },
                    { value: "yandex", text: "Yandex" },
                    { value: "google", text: "Google" },
                    { value: "yahoo_japan", text: "Yahoo! JAPAN" },
                    { value: "startpage", text: "Startpage" },
                    { value: "qwant", text: "Qwant" },
                    { value: "baidu", text: "Baidu" },
                    { value: "coccoc", text: "Cốc Cốc" },
                    { value: "solofield", text: "Solofield" }
                ]
            },
            {
                description: "News",
                parameter: "scraper_news" as keyof Settings,
                options: [
                    { value: "ddg", text: "DuckDuckGo" },
                    { value: "brave", text: "Brave" },
                    { value: "google", text: "Google" },
                    { value: "yahoo_japan", text: "Yahoo! JAPAN" },
                    { value: "startpage", text: "Startpage" },
                    { value: "qwant", text: "Qwant" },
                    { value: "mojeek", text: "Mojeek" },
                    { value: "baidu", text: "Baidu" }
                ]
            },
            {
                description: "Music",
                parameter: "scraper_music" as keyof Settings,
                options: [
                    { value: "sc", text: "SoundCloud" },
                    { value: "swisscows", text: "Swisscows" }
                ]
            }
        ]
    }
];

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings>({
        nsfw: "no",
        theme: "dark",
        bg_noclick: "no",
        scraper_ac: "brave",
        scraper_web: "brave",
        scraper_images: "ddg",
        scraper_videos: "yt",
        scraper_news: "google",
        scraper_music: "sc",
    });
    const [saved, setSaved] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Load settings from cookies
        const cookies = document.cookie.split(";").reduce((acc, c) => {
            const [key, value] = c.trim().split("=");
            if (key) acc[key] = decodeURIComponent(value);
            return acc;
        }, {} as Record<string, string>);

        setSettings(prev => ({
            ...prev,
            ...Object.keys(prev).reduce((acc, key) => {
                if (cookies[key]) acc[key as keyof Settings] = cookies[key];
                return acc;
            }, {} as Partial<Settings>)
        }));
    }, []);

    const saveSettings = () => {
        const expires = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toUTCString();

        Object.entries(settings).forEach(([key, value]) => {
            document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
        });

        // Apply theme immediately for instant feedback
        document.documentElement.setAttribute("data-theme", settings.theme);

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);

        // Refresh server components to ensure they verify the new cookies
        router.refresh();
    };

    const resetSettings = () => {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        }
        window.location.reload();
    };

    return (
        <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans">
            {/* Header */}
            <header className="sticky top-0 z-20 backdrop-blur-md bg-[var(--background-2)]/90 border-b border-[var(--border)] shadow-md">
                <div className="max-w-[1300px] mx-auto px-4 py-2.5 flex items-center justify-between">
                    <a href="/" className="flex items-center pt-1">
                        <img src="/logo.svg" alt="Sorvx Logo" className="h-[36px] md:h-[42px] w-auto" />
                    </a>
                    <nav className="flex items-center gap-2 md:gap-3 text-[13px] md:text-sm text-[var(--muted)]">
                        <a href="/" className="px-3 py-1.5 rounded-full hover:text-[var(--foreground)] transition-colors">Home</a>
                        <span className="px-3 py-1.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] shadow-sm flex items-center gap-2 font-medium">
                            <SettingsIcon size={14} /> Settings
                        </span>
                    </nav>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-[1300px] mx-auto px-4 py-6 md:py-12 space-y-6">
                <div className="max-w-3xl mx-auto space-y-12">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-[var(--background-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shadow-lg">
                            <SettingsIcon size={22} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">Settings</h1>
                            <p className="text-sm text-[var(--muted)]">Tune your search experience and privacy defaults.</p>
                        </div>
                    </div>

                    {SETTINGS_CONFIG.map((category) => (
                        <div key={category.name} className="space-y-6">
                            <h2 className="text-lg font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2">{category.name}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {category.settings.map((setting) => (
                                    <div key={setting.parameter} className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 transition hover:border-[var(--accent)]/50">
                                        <label className="block text-[13px] md:text-sm font-semibold mb-2 text-[var(--foreground)]" dangerouslySetInnerHTML={{ __html: setting.description.split('<br>')[0] }}></label>
                                        <div className="relative">
                                            <select
                                                value={settings[setting.parameter]}
                                                onChange={(e) => setSettings({ ...settings, [setting.parameter]: e.target.value })}
                                                className="w-full appearance-none bg-[var(--background-2)] border border-[var(--border)] rounded-lg px-3 py-2 md:py-2.5 text-[13px] md:text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all cursor-pointer"
                                            >
                                                {setting.options.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.text}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted)]">
                                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-[var(--border)]">
                        <p className="text-[13px] text-[var(--muted)] text-center sm:text-left">Settings are saved locally as cookies for 400 days.</p>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <button
                                onClick={resetSettings}
                                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold border border-red-500/20 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                Reset Settings
                            </button>
                            <button
                                onClick={saveSettings}
                                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-2)] text-white text-sm font-bold shadow-lg shadow-purple-500/25 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                {saved ? "✓ Saved Successfully!" : "Save Settings"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
