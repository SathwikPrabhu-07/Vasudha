import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const languages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'te', label: 'తెలుగు' },
];

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const lang = e.target.value;
        i18n.changeLanguage(lang);
        localStorage.setItem('vasudha_lang', lang);
    };

    return (
        <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <select
                value={i18n.language?.substring(0, 2) || 'en'}
                onChange={handleChange}
                className="bg-transparent text-sm text-foreground border border-border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
            >
                {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                        {lang.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default LanguageSwitcher;
