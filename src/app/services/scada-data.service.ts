import { Injectable, OnDestroy, NgZone, signal, WritableSignal, Signal } from '@angular/core';
import { Subject, merge } from 'rxjs';
import { scan, map, distinctUntilChanged } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

import { ScadaTag, Alarm, AlarmId, AlarmRule } from '../models/scada.model';
import { ALARM_RULES } from '../models/alarm-rules.config';

type BatchAlarmEvent =
    | { type: 'DATA'; tags: ScadaTag[] }
    | { type: 'ACK'; id: AlarmId, deviceId: string };

@Injectable({
    providedIn: 'root'
})
export class ScadaDataService implements OnDestroy {
    private socket!: WebSocket;
    private isDestroyed = false;
    private reconnectTimer?: ReturnType<typeof setTimeout>;
    private reconnectAttempts = 0;

    private tagSignals = new Map<string, WritableSignal<ScadaTag>>();
    private pendingUpdates = new Map<string, ScadaTag>();
    private flushTimer?: ReturnType<typeof setInterval>;

    private rawBatchStream$ = new Subject<ScadaTag[]>();
    private acknowledgeStream$ = new Subject<{ id: AlarmId, deviceId: string }>();
    private rulesByTagId = new Map<string, AlarmRule[]>();

    public readonly connectionStatus = signal<'connected' | 'disconnected'>('disconnected');
    public readonly tagsCount = signal<number>(0);
    public readonly alarms: Signal<Alarm[]>;

    constructor(private zone: NgZone) {
        this.indexAlarmRules();
        this.preloadSignals([
            'TR_01_AMP', 'TR_01_VOLT',
            'TR_02_AMP', 'TR_02_VOLT',
            'TR_03_AMP', 'TR_03_VOLT'
        ]);

        this.alarms = toSignal(this.buildAlarmsStream(), { initialValue: [] });
        this.startUiFlushLoop();
        this.connect();
    }

    /**
     * Initializes WritableSignals for known tags to avoid creation side-effects inside computed.
     */
    private preloadSignals(tagIds: string[]) {
        for (const id of tagIds) {
            this.tagSignals.set(id, signal<ScadaTag>({ id, value: 0, quality: 'bad', timestamp: 0 }));
        }
        this.tagsCount.set(this.tagSignals.size);
    }

    /**
     * Returns a read-only Signal for a specific tag.
     * Components can reactively subscribe to this signal to update their UI.
     */
    public getTagSignal(tagId: string): Signal<ScadaTag> {
        const sig = this.tagSignals.get(tagId);
        if (!sig) {
            // Fallback for unknown tags (creates a new signal on the fly)
            const newSig = signal<ScadaTag>({ id: tagId, value: 0, quality: 'bad', timestamp: 0 });
            this.tagSignals.set(tagId, newSig);
            this.tagsCount.set(this.tagSignals.size);
            return newSig.asReadonly();
        }
        return sig.asReadonly();
    }

    /**
     * Returns a current snapshot of all tags. Used mainly for the debug panel.
     */
    public getSnapshot(): Record<string, ScadaTag> {
        const snapshot: Record<string, ScadaTag> = {};
        this.tagSignals.forEach((sig, key) => { snapshot[key] = sig(); });
        return snapshot;
    }

    /**
     * Sends an acknowledgment command for a specific alarm on a specific device.
     */
    public acknowledgeAlarm(id: AlarmId, deviceId: string) {
        this.acknowledgeStream$.next({ id, deviceId });
    }

    /**
     * Batches high-frequency WebSocket updates and flushes them to UI signals every 100ms.
     * Runs outside Angular zone to avoid triggering global Change Detection on every packet.
     */
    private startUiFlushLoop() {
        this.zone.runOutsideAngular(() => {
            this.flushTimer = setInterval(() => {
                if (this.pendingUpdates.size === 0) return;
                this.zone.run(() => {
                    this.pendingUpdates.forEach((tag, id) => {
                        const existingSig = this.tagSignals.get(id);
                        if (existingSig) {
                            existingSig.set(tag);
                        } else {
                            this.tagSignals.set(id, signal(tag));
                            this.tagsCount.set(this.tagSignals.size);
                        }
                    });
                    this.pendingUpdates.clear();
                });
            }, 100);
        });
    }

    /**
     * Marks all tags as 'bad' quality when connection is lost.
     * This prevents the operator from seeing stale data as valid.
     */
    private invalidateAllTags() {
        this.pendingUpdates.clear();
        this.zone.run(() => {
            this.tagSignals.forEach((sig) => {
                const current = sig();
                if (current.quality !== 'bad') {
                    sig.set({ ...current, quality: 'bad' });
                }
            });
        });
    }

    /**
     * Groups alarm rules by tagId for O(1) lookup during incoming data processing.
     */
    private indexAlarmRules() {
        for (const rule of ALARM_RULES) {
            const existing = this.rulesByTagId.get(rule.tagId) ?? [];
            existing.push(rule);
            this.rulesByTagId.set(rule.tagId, existing);
        }
    }

    /**
     * Builds a reactive stream of active alarms.
     * Merges incoming telemetry data and acknowledgment events into a single state machine.
     */
    private buildAlarmsStream() {
        const dataEvents$ = this.rawBatchStream$.pipe(map((tags): BatchAlarmEvent => ({ type: 'DATA', tags })));
        const ackEvents$ = this.acknowledgeStream$.pipe(
            map((data): BatchAlarmEvent => ({ type: 'ACK', id: data.id, deviceId: data.deviceId }))
        );

        return merge(dataEvents$, ackEvents$).pipe(
            scan((activeAlarms: Alarm[], event: BatchAlarmEvent) => {
                if (event.type === 'ACK') {
                    return activeAlarms.map(a => {
                        if (a.id === event.id && a.deviceId === event.deviceId) {
                            return { ...a, isAcknowledged: true };
                        }
                        return a;
                    }).filter(a => a.isActive || !a.isAcknowledged);
                }

                let hasChanges = false;
                const nextAlarms = [...activeAlarms];

                for (const tag of event.tags) {
                    const rules = this.rulesByTagId.get(tag.id);
                    if (!rules) continue;
                    for (const rule of rules) {
                        if (this.evaluateRule(nextAlarms, rule, tag)) hasChanges = true;
                    }
                }

                if (!hasChanges) return activeAlarms;
                return nextAlarms.sort((a, b) => a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1);
            }, [] as Alarm[]),
            distinctUntilChanged()
        );
    }

    /**
     * Evaluates a single alarm rule against a tag value.
     * Implements hysteresis (separate trigger and reset conditions) to prevent alarm flickering.
     * Returns true if the alarm state was changed.
     */
    private evaluateRule(alarms: Alarm[], rule: AlarmRule, tag: ScadaTag): boolean {
        const idx = alarms.findIndex(a => a.id === rule.id && a.deviceId === this.getDeviceIdFromTag(tag.id));
        const isCurrentlyActive = idx !== -1 && alarms[idx].isActive;

        if (!isCurrentlyActive) {
            if (rule.triggerCondition(tag)) {
                if (idx === -1) {
                    alarms.push({
                        id: rule.id,
                        deviceId: this.getDeviceIdFromTag(tag.id),
                        message: rule.message,
                        severity: rule.severity,
                        isAcknowledged: false,
                        isActive: true
                    });
                } else {
                    alarms[idx] = { ...alarms[idx], isActive: true };
                }
                return true;
            }
            return false;
        }

        const shouldReset = rule.resetCondition ? rule.resetCondition(tag) : !rule.triggerCondition(tag);
        if (shouldReset) {
            if (alarms[idx].isAcknowledged) alarms.splice(idx, 1);
            else alarms[idx] = { ...alarms[idx], isActive: false };
            return true;
        }
        return false;
    }

    /**
     * Extracts the device ID from a tag ID (e.g., 'TR_01_AMP' -> 'TR_01').
     */
    private getDeviceIdFromTag(tagId: string): string {
        return tagId.replace('_AMP', '').replace('_VOLT', '');
    }

    /**
     * Establishes WebSocket connection.
     * Runs outside Angular zone to prevent global Change Detection on incoming packets.
     * Implements exponential backoff for reconnection.
     */
    private connect() {
        if (this.isDestroyed) return;
        this.zone.runOutsideAngular(() => {
            this.socket = new WebSocket('ws://localhost:8081');

            this.socket.onopen = () => {
                this.reconnectAttempts = 0;
                this.zone.run(() => this.connectionStatus.set('connected'));
            };

            this.socket.onmessage = (event) => {
                try {
                    const incomingTags: ScadaTag[] = JSON.parse(event.data);
                    if (incomingTags.length > 0) {
                        for (const tag of incomingTags) this.pendingUpdates.set(tag.id, tag);
                        this.zone.run(() => this.rawBatchStream$.next(incomingTags));
                    }
                } catch (e) { console.error('SCADA packet parsing error:', e); }
            };

            this.socket.onclose = () => {
                this.zone.run(() => this.connectionStatus.set('disconnected'));
                this.invalidateAllTags();
                if (!this.isDestroyed) {
                    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
                    this.reconnectAttempts++;
                    this.reconnectTimer = setTimeout(() => this.connect(), delay);
                }
            };
        });
    }

    ngOnDestroy() {
        this.isDestroyed = true;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        if (this.flushTimer) clearInterval(this.flushTimer);
        if (this.socket) this.socket.close();
        this.rawBatchStream$.complete();
        this.acknowledgeStream$.complete();
    }
}
