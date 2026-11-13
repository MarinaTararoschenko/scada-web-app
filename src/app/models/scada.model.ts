export interface ScadaTag {
    id: string;
    value: number;
    quality: 'good' | 'bad';
    timestamp: number;
}

export type AlarmId = 'sc' | 'overload' | 'overvoltage' | 'undervoltage';

export interface Alarm {
    id: AlarmId;
    deviceId: string;
    message: string;
    severity: 'critical' | 'warning';
    isAcknowledged: boolean;
    isActive: boolean;
}

export interface AlarmRule {
    id: AlarmId;
    tagId: string;
    message: string;
    severity: 'critical' | 'warning';
    triggerCondition: (tag: ScadaTag) => boolean;
    resetCondition?: (tag: ScadaTag) => boolean;
}
