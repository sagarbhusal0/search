"use client";

import { useState, useEffect } from "react";
import { Settings, Moon, Search as SearchIcon, Shield, ArrowLeft, Check } from "lucide-react";
import Image from "next/image";

export default function SettingsPage() {
    const [autocomplete, setAutocomplete] = useState("brave");
    const [theme, setTheme] = useState("dark");
    const [nsfw, setNsfw] = useState("off");
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // Load settings from cookies
        const cookies = document.cookie.split("; ");
        cookies.forEach((cookie) => {
            const [key, value] = cookie.split("=");
            if (key === "autocomplete") setAutocomplete(value);
            if (key === "theme") setTheme(value);
            if (key === "nsfw") setNsfw(value);
        });
    }, []);

    const saveSettings = () => {
        const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `autocomplete=${autocomplete}; expires=${expires}; path=/`;
        document.cookie = `theme=${theme}; expires=${expires}; path=/`;
        document.cookie = `nsfw=${nsfw}; expires=${expires}; path=/`;
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const SettingCard = ({
        icon: Icon,
        title,
        description,
        children
    }: {
        icon: React.ElementType;
        title: string;
        description: string;
        children: React.ReactNode;
    }) => (
        <div className="card-glass p-6 hover-lift fade-in">
            <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-[--primary-purple]/20 to-[--primary-cyan]/20">
                    <Icon size={24} className="text-[--primary-cyan]" />
                </div>
                <div className="flex-1">
                    <h3 className="font-medium text-[--text-primary] mb-1">{title}</h3>
                    <p className="text-sm text-[--text-secondary] mb-4">{description}</p>
                    {children}
                </div>
            </div>
        </div>
    );

    const SelectOption = ({
        options,
        value,
        onChange
    }: {
        options: { value: string; label: string }[];
        value: string;
        onChange: (v: string) => void;
    }) => (
        <div className="flex flex-wrap gap-2">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`px-4 py-2 rounded-full text-sm transition ${value === opt.value
                            ? "bg-gradient-to-r from-[--primary-purple] to-[--primary-cyan] text-white"
                            : "btn-glass"
                        }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );

    return (
        <main className="min-h-screen animated-bg">
            {/* Header */}
            <header className="glass">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <a href="/" className="p-2 hover:bg-white/5 rounded-full transition">
                        <ArrowLeft size={20} className="text-[--text-secondary]" />
                    </a>
                    <Image src="/logo.png" alt="Sorvx" width={36} height={36} />
                    <h1 className="text-xl font-semibold gradient-text">Settings</h1>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="space-y-4">
                    {/* Autocomplete */}
                    <SettingCard
                        icon={SearchIcon}
                        title="Autocomplete Provider"
                        description="Choose which service provides search suggestions as you type."
                    >
                        <SelectOption
                            value={autocomplete}
                            onChange={setAutocomplete}
                            options={[
                                { value: "brave", label: "Brave" },
                                { value: "ddg", label: "DuckDuckGo" },
                                { value: "google", label: "Google" },
                                { value: "off", label: "Disabled" },
                            ]}
                        />
                    </SettingCard>

                    {/* Theme */}
                    <SettingCard
                        icon={Moon}
                        title="Theme"
                        description="Customize the appearance of the search interface."
                    >
                        <SelectOption
                            value={theme}
                            onChange={setTheme}
                            options={[
                                { value: "dark", label: "Dark" },
                                { value: "light", label: "Light" },
                                { value: "gruvbox", label: "Gruvbox" },
                            ]}
                        />
                    </SettingCard>

                    {/* NSFW */}
                    <SettingCard
                        icon={Shield}
                        title="Safe Search"
                        description="Filter explicit content from search results."
                    >
                        <SelectOption
                            value={nsfw}
                            onChange={setNsfw}
                            options={[
                                { value: "off", label: "Safe (Hide NSFW)" },
                                { value: "on", label: "Show NSFW" },
                            ]}
                        />
                    </SettingCard>
                </div>

                {/* Save Button */}
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={saveSettings}
                        className={`btn-primary px-8 py-3 text-base flex items-center gap-2 ${saved ? "bg-green-500" : ""
                            }`}
                    >
                        {saved ? (
                            <>
                                <Check size={20} /> Saved!
                            </>
                        ) : (
                            "Save Settings"
                        )}
                    </button>
                </div>

                {/* Info */}
                <p className="text-center text-[--text-muted] text-sm mt-6">
                    Settings are stored locally in your browser cookies. No data is sent to our servers.
                </p>
            </div>
        </main>
    );
}
