import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false, className = '' }) => {
  const { isDark, setTheme, toggleTheme } = useTheme();

  if (compact) {
    return (
      <div
        className={`flex items-center bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs ${className}`}
        role="group"
        aria-label="Theme mode switcher"
      >
        <button
          onClick={() => setTheme('light')}
          title="Light Theme"
          aria-label="Switch to Light theme"
          className={`p-1.5 rounded-md transition-all duration-150 flex items-center justify-center ${
            !isDark
              ? 'bg-white text-amber-500 shadow-sm border border-slate-200'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setTheme('dark')}
          title="Dark Theme"
          aria-label="Switch to Dark theme"
          className={`p-1.5 rounded-md transition-all duration-150 flex items-center justify-center ${
            isDark
              ? 'bg-slate-700 text-indigo-400 shadow-sm border border-slate-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Moon className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs shrink-0 ${className}`}
      role="group"
      aria-label="Theme mode switcher"
    >
      <button
        onClick={() => setTheme('light')}
        title="Switch to Light Theme"
        aria-label="Light Theme"
        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all duration-150 flex items-center gap-1.5 ${
          !isDark
            ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        <Sun className={`w-3.5 h-3.5 ${!isDark ? 'text-amber-500' : 'text-slate-400'}`} />
        <span>Light</span>
      </button>

      <button
        onClick={() => setTheme('dark')}
        title="Switch to Dark Theme"
        aria-label="Dark Theme"
        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all duration-150 flex items-center gap-1.5 ${
          isDark
            ? 'bg-slate-700 text-slate-100 shadow-xs border border-slate-600 font-bold'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <Moon className={`w-3.5 h-3.5 ${isDark ? 'text-indigo-400' : 'text-slate-400'}`} />
        <span>Dark</span>
      </button>
    </div>
  );
};
