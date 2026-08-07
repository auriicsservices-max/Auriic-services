import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLinksArray(links: any): Array<{ label: string; url: string }> {
  if (!links) return [];
  if (Array.isArray(links)) return links;
  if (typeof links === 'object') {
    const list: Array<{ label: string; url: string }> = [];
    if (links.linkedin) list.push({ label: 'LinkedIn', url: links.linkedin });
    if (links.github) list.push({ label: 'GitHub', url: links.github });
    if (links.portfolio) list.push({ label: 'Portfolio', url: links.portfolio });
    if (links.website) list.push({ label: 'Website', url: links.website });
    if (Array.isArray(links.other)) {
      links.other.forEach((u: string) => {
        if (u) list.push({ label: 'Other', url: u });
      });
    }
    if (Array.isArray(links.other_urls)) {
      links.other_urls.forEach((u: string) => {
        if (u) list.push({ label: 'Other', url: u });
      });
    }
    return list;
  }
  return [];
}

