/**
 * SupabaseProvider — Yjs CRDT provider using Supabase Realtime broadcast.
 *
 * Syncs a Y.Doc between multiple clients without a dedicated WebSocket server.
 * Uses Supabase Realtime "broadcast" for state vectors + update diffs,
 * and "presence" for cursor/awareness data.
 */

import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SupabaseProviderOptions {
  /** Unique channel key, e.g. `doc:{documentId}` */
  channelKey: string;
  /** The Y.Doc to sync */
  doc: Y.Doc;
  /** Optional: user info for awareness (cursor labels) */
  user?: { id: string; name: string; color: string };
}

// Convert Uint8Array ↔ base64 for JSON transport
function toBase64(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export class SupabaseProvider {
  doc: Y.Doc;
  awareness: Awareness;
  private channel: RealtimeChannel;
  private channelKey: string;
  private clientId: number;
  private synced = false;
  private destroyed = false;
  private userId?: string;

  constructor({ channelKey, doc, user }: SupabaseProviderOptions) {
    this.doc = doc;
    this.channelKey = channelKey;
    this.clientId = doc.clientID;
    this.userId = user?.id;

    // Create awareness
    this.awareness = new Awareness(doc);
    if (user) {
      this.awareness.setLocalStateField('user', {
        name: user.name,
        color: user.color,
        colorLight: user.color + '40',
      });
    }

    // Listen for local doc updates → broadcast to others
    this.doc.on('update', this._onDocUpdate);

    // Listen for local awareness updates → broadcast
    this.awareness.on('update', this._onAwarenessUpdate);

    // Create Supabase channel
    this.channel = supabase.channel(`yjs:${channelKey}`, {
      config: { broadcast: { self: false } },
    });

    // Listen for remote doc updates
    this.channel.on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
      if (this.destroyed || payload.clientId === this.clientId) return;
      try {
        const update = fromBase64(payload.update);
        Y.applyUpdate(this.doc, update, 'remote');
      } catch (e) {
        console.error('[SupabaseProvider] Failed to apply update:', e);
      }
    });

    // Listen for remote awareness updates
    this.channel.on('broadcast', { event: 'yjs-awareness' }, ({ payload }) => {
      if (this.destroyed || payload.clientId === this.clientId) return;
      try {
        const update = fromBase64(payload.update);
        applyAwarenessUpdate(this.awareness, update, 'remote');
      } catch (e) {
        console.error('[SupabaseProvider] Failed to apply awareness:', e);
      }
    });

    // Sync request: when a new client joins, it requests full state
    this.channel.on('broadcast', { event: 'yjs-sync-request' }, ({ payload }) => {
      if (this.destroyed || payload.clientId === this.clientId) return;
      // Send full state to the requesting client
      const state = Y.encodeStateAsUpdate(this.doc);
      this.channel.send({
        type: 'broadcast',
        event: 'yjs-sync-response',
        payload: {
          clientId: this.clientId,
          targetClientId: payload.clientId,
          state: toBase64(state),
        },
      });
    });

    // Sync response: apply full state from another client
    this.channel.on('broadcast', { event: 'yjs-sync-response' }, ({ payload }) => {
      if (this.destroyed || payload.targetClientId !== this.clientId) return;
      try {
        const state = fromBase64(payload.state);
        Y.applyUpdate(this.doc, state, 'remote');
        this.synced = true;
      } catch (e) {
        console.error('[SupabaseProvider] Failed to apply sync response:', e);
      }
    });

    // Subscribe and request initial sync
    this.channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Request full state from any existing client
        this.channel.send({
          type: 'broadcast',
          event: 'yjs-sync-request',
          payload: { clientId: this.clientId },
        });

        // Broadcast our awareness
        const awarenessUpdate = encodeAwarenessUpdate(this.awareness, [this.clientId]);
        this.channel.send({
          type: 'broadcast',
          event: 'yjs-awareness',
          payload: { clientId: this.clientId, update: toBase64(awarenessUpdate) },
        });
      }
    });
  }

  private _onDocUpdate = (update: Uint8Array, origin: any) => {
    if (this.destroyed || origin === 'remote') return;
    this.channel.send({
      type: 'broadcast',
      event: 'yjs-update',
      payload: { clientId: this.clientId, update: toBase64(update) },
    });
  };

  private _onAwarenessUpdate = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
    if (this.destroyed) return;
    const changedClients = added.concat(updated, removed);
    const update = encodeAwarenessUpdate(this.awareness, changedClients);
    this.channel.send({
      type: 'broadcast',
      event: 'yjs-awareness',
      payload: { clientId: this.clientId, update: toBase64(update) },
    });
  };

  get isSynced(): boolean {
    return this.synced;
  }

  destroy() {
    this.destroyed = true;
    this.doc.off('update', this._onDocUpdate);
    this.awareness.off('update', this._onAwarenessUpdate);
    removeAwarenessStates(this.awareness, [this.clientId], 'provider-destroy');
    this.awareness.destroy();
    this.channel.unsubscribe();
  }
}
