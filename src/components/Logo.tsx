import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useBranding } from '../contexts/BrandingContext';

interface LogoProps {
  collapsed?: boolean;
  variant?: 'sidebar' | 'invoice' | 'login' | 'header' | 'theme';
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
  const { 
    activeLogoUrl, 
    activeLoginLogoUrl, 
    activeHeaderLogoUrl, 
    activeInvoiceLogoUrl 
  } = useBranding();

  const isDarkBg = theme === 'dark';

  const defaultRectechLogo = isDarkBg 
    ? 'https://aurrum.co/wp-content/uploads/2026/05/Rectech-white-logo.svg' 
    : 'https://aurrum.co/wp-content/uploads/2026/05/Rectech-Logo.svg';

  // Determine logo source based on requested variant
  let logoSrc = activeLogoUrl;
  if (variant === 'login') {
    logoSrc = activeLoginLogoUrl || activeLogoUrl;
  } else if (variant === 'header') {
    logoSrc = activeHeaderLogoUrl || activeLogoUrl;
  } else if (variant === 'invoice') {
    logoSrc = activeInvoiceLogoUrl || activeLogoUrl;
  } else if (variant === 'sidebar') {
    logoSrc = activeLogoUrl;
  }

  logoSrc = logoSrc || defaultRectechLogo;

  // Determine sizing based on prop
  const sizeClasses = {
    sm: { box: 'w-8 h-8 rounded-lg', icon: 16, title: 'text-base', sub: 'text-[8px] mt-0.5', imgHeight: 'h-6' },
    md: { box: 'w-10 h-10 rounded-xl', icon: 20, title: 'text-lg', sub: 'text-[10px] mt-1', imgHeight: 'h-8' },
    lg: { box: 'w-14 h-14 rounded-[14px]', icon: 28, title: 'text-2xl', sub: 'text-[12px] mt-1', imgHeight: 'h-12' }
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  if (logoSrc) {
    return (
      <div className={`flex items-center select-none ${className}`} id="aurrum-logo">
        <img 
          src={logoSrc} 
          alt="Rectech Logo" 
          className={`${collapsed ? 'h-8 w-8 rounded-lg' : currentSize.imgHeight} w-auto object-contain max-w-[220px] transition-all duration-300`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = defaultRectechLogo;
          }}
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
