import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useBranding } from '../contexts/BrandingContext';

interface LogoProps {
  collapsed?: boolean;
  variant?: 'sidebar' | 'invoice' | 'theme';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({
  collapsed = false,
  variant = 'theme',
  className = '',
  size = 'md',
}: LogoProps) {
  const { theme } = useTheme();
  const { logoUrlLight, logoUrlDark, activeLogoUrl } = useBranding();

  // The sidebar is always on a dark background in dark mode, or light background in light mode.
  // Otherwise, the logo should adapt dynamically to the active theme.
  const isDarkBg = variant === 'sidebar' ? theme === 'dark' : (variant === 'theme' ? theme === 'dark' : false);

  // Invoices are always on a light background (white paper/PDF canvas)
  const logoSrc = variant === 'invoice' 
    ? (logoUrlLight || logoUrlDark) 
    : activeLogoUrl;

  // Determine sizing based on prop
  const sizeClasses = {
    sm: { box: 'w-8 h-8 rounded-lg', icon: 16, title: 'text-base', sub: 'text-[8px] mt-0.5', imgHeight: 'h-6' },
    md: { box: 'w-10 h-10 rounded-xl', icon: 20, title: 'text-lg', sub: 'text-[10px] mt-1', imgHeight: 'h-8' },
    lg: { box: 'w-12 h-12 rounded-[14px]', icon: 24, title: 'text-xl', sub: 'text-[11px] mt-1', imgHeight: 'h-10' }
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  if (logoSrc) {
    return (
      <div className={`flex items-center select-none ${className}`} id="aurrum-logo">
        <img 
          src={logoSrc} 
          alt="Company Logo" 
          className={`${collapsed ? 'h-8 w-8 rounded-lg' : currentSize.imgHeight} w-auto object-contain max-w-[180px] transition-all duration-300`}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`} id="aurrum-logo">
      {/* Golden Sparkling Brand Mark Emblem */}
      <div className={`${currentSize.box} bg-gradient-to-br from-[#A98B56] to-[#BC9B66] flex items-center justify-center shadow-md shrink-0`}>
        <Sparkles className="text-white" size={currentSize.icon} />
      </div>
      
      {!collapsed && (
        <div className="flex flex-col text-left leading-none">
          <span className={`font-extrabold tracking-tight font-sans leading-none ${currentSize.title} ${
            isDarkBg ? 'text-white' : 'text-[#002D38]'
          }`}>
            Aurrum <span className="text-[#BC9B66] font-normal" style={{ fontSize: '0.75em' }}>CRM</span>
          </span>
          <span className={`font-semibold tracking-wider uppercase ${currentSize.sub} ${
            isDarkBg ? 'text-[#A9C2CE]' : 'text-[#005472]'
          }`}>
            Talent Insights
          </span>
        </div>
      )}
    </div>
  );
}
