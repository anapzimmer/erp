"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./SiteMotion.module.css";

export default function SiteMotion({ children, className }: { children: ReactNode; className: string }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!root.current || !('IntersectionObserver' in window)) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.setAttribute('data-site-revealed', 'true');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    root.current.querySelectorAll('article').forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return <main ref={root} className={`${className} ${styles.page}`}>{children}</main>;
}
