import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private document = inject(DOCUMENT);
  readonly theme = signal<Theme>(this.initial());

  constructor() {
    effect(() => {
      const value = this.theme();
      this.document.documentElement.dataset['theme'] = value;
      try { localStorage.setItem('theme', value); } catch { /* ignore */ }
    });
  }

  toggle() {
    this.theme.update(t => (t === 'light' ? 'dark' : 'light'));
  }

  private initial(): Theme {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }
}
