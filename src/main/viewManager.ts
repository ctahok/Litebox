import { app, BrowserWindow, WebContentsView, session } from 'electron';
import path from 'node:path';
import type { ServiceTab } from '@shared/types';

export interface ViewEntry {
  view: WebContentsView | null;
  lastActiveAt: number;
  unreadCount: number;
}

export class ViewManager {
  private mainWindow: BrowserWindow;
  private views = new Map<string, ViewEntry>();
  private activeServiceId: string | null = null;
  private overlayOpen = false;
  private sharedSession = session.fromPartition('persist:shared-apps');

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;

    const rawUA = this.sharedSession.getUserAgent();
    const cleanUA = rawUA
      .replace(/Electron\/[\d.]+ /g, '')
      .replace(/LiteBox\/[\d.]+ /g, '')
      .trim();
    this.sharedSession.setUserAgent(cleanUA);
  }

  getSharedSession() {
    return this.sharedSession;
  }

  getViews() {
    return this.views;
  }

  getActiveServiceId() {
    return this.activeServiceId;
  }

  setActiveServiceId(id: string | null) {
    this.activeServiceId = id;
  }

  setOverlayOpen(open: boolean) {
    this.overlayOpen = open;
    if (open) {
      this.detachActiveView();
    } else {
      this.attachActiveView();
    }
  }

  private getContentBounds() {
    const { width, height } = this.mainWindow.getContentBounds();
    return { x: 68, y: 0, width: Math.max(0, width - 68), height };
  }

  private attachView(view: WebContentsView) {
    const bounds = this.getContentBounds();
    view.setBounds(bounds);
    const cv = this.mainWindow.contentView as any;
    cv.addSubview(view);
  }

  private detachView(view: WebContentsView) {
    const v = view as any;
    v.removeFromSuperview?.();
  }

  private attachActiveView() {
    if (this.activeServiceId === null) return;
    const entry = this.views.get(this.activeServiceId);
    if (entry?.view && !this.overlayOpen) {
      this.attachView(entry.view);
    }
  }

  private detachActiveView() {
    if (this.activeServiceId === null) return;
    const entry = this.views.get(this.activeServiceId);
    if (entry?.view) {
      this.detachView(entry.view);
    }
  }

  async createView(serviceId: string, url: string) {
    const existing = this.views.get(serviceId);
    if (existing?.view) {
      this.detachView(existing.view);
      await existing.view.webContents.close();
    }

    const view = new WebContentsView({
      session: this.sharedSession,
    } as any);

    view.webContents.on('did-fail-load', () => {
    });

    view.webContents.on('page-title-updated', (_e: any, title: string) => {
      const entry = this.views.get(serviceId);
      if (entry) {
        const match = title.match(/\((\d+)\)/);
        entry.unreadCount = match ? parseInt(match[1], 10) : 0;
      }
    });

    await view.webContents.loadURL(url);

    this.views.set(serviceId, {
      view,
      lastActiveAt: Date.now(),
      unreadCount: 0,
    });

    if (this.activeServiceId === serviceId && !this.overlayOpen) {
      this.attachView(view);
    }

    return view;
  }

  async destroyView(serviceId: string) {
    const entry = this.views.get(serviceId);
    if (entry && entry.view) {
      this.detachView(entry.view);
      await entry.view.webContents.close();
      this.views.delete(serviceId);
    }
    if (this.activeServiceId === serviceId) {
      this.activeServiceId = null;
    }
  }

  async activateService(serviceId: string) {
    if (this.activeServiceId === serviceId) return;

    const prevEntry = this.activeServiceId ? this.views.get(this.activeServiceId) : null;
    if (prevEntry?.view) {
      this.detachView(prevEntry.view);
    }

    this.activeServiceId = serviceId;

    const entry = this.views.get(serviceId);
    if (entry?.view && !this.overlayOpen) {
      this.attachView(entry.view);
      entry.lastActiveAt = Date.now();
    }
  }

  async deactivateService(serviceId: string) {
    const entry = this.views.get(serviceId);
    if (entry?.view) {
      this.detachView(entry.view);
    }
    if (this.activeServiceId === serviceId) {
      this.activeServiceId = null;
    }
  }

  updateBounds() {
    const bounds = this.getContentBounds();
    this.views.forEach((entry) => {
      if (entry.view) {
        entry.view.setBounds(bounds);
      }
    });
  }

  async destroyAllViews() {
    for (const [serviceId, entry] of this.views) {
      if (entry.view) {
        this.detachView(entry.view);
        await entry.view.webContents.close();
      }
    }
    this.views.clear();
    this.activeServiceId = null;
  }
}




