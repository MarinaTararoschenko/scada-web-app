import { AlarmRule } from './scada.model';

export const ALARM_RULES: AlarmRule[] = [
    // RULES FOR TR_01
    {
        id: 'sc',
        tagId: 'TR_01_AMP',
        message: 'КЗ (ТР_01)',
        severity: 'critical',
        triggerCondition: (tag) => tag.quality === 'good' && tag.value >= 300,
        resetCondition: (tag) => tag.quality === 'good' && tag.value < 295
    },
    {
        id: 'overload',
        tagId: 'TR_01_AMP',
        message: 'Перегруз (ТР_01)',
        severity: 'warning',
        triggerCondition: (tag) => tag.quality === 'good' && tag.value > 212 && tag.value < 300,
        resetCondition: (tag) => tag.quality === 'good' && (tag.value <= 210 || tag.value >= 300)
    },
    {
        id: 'overvoltage',
        tagId: 'TR_01_VOLT',
        message: 'Перенапряжение (ТР_01)',
        severity: 'critical',
        triggerCondition: (tag) => tag.quality === 'good' && tag.value > 10.6,
        resetCondition: (tag) => tag.quality === 'good' && tag.value <= 10.55
    },
    {
        id: 'undervoltage',
        tagId: 'TR_01_VOLT',
        message: 'Недонапряжение (ТР_01)',
        severity: 'warning',
        triggerCondition: (tag) => tag.quality === 'good' && tag.value > 0 && tag.value < 10.0,
        resetCondition: (tag) => tag.quality === 'good' && tag.value >= 10.05
    },

    // RULES FOR TR_02
    {
        id: 'sc',
        tagId: 'TR_02_AMP',
        message: 'КЗ (ТР_02)',
        severity: 'critical',
        triggerCondition: (tag) => tag.quality === 'good' && tag.value >= 300,
        resetCondition: (tag) => tag.quality === 'good' && tag.value < 295
    },
    {
        id: 'overload',
        tagId: 'TR_02_AMP',
        message: 'Перегруз (ТР_02)',
        severity: 'warning',
        triggerCondition: (tag) => tag.quality === 'good' && tag.value > 212 && tag.value < 300,
        resetCondition: (tag) => tag.quality === 'good' && (tag.value <= 210 || tag.value >= 300)
    },

    // RULES FOR TR_03
    {
        id: 'sc',
        tagId: 'TR_03_AMP',
        message: 'КЗ (ТР_03)',
        severity: 'critical',
        triggerCondition: (tag) => tag.quality === 'good' && tag.value >= 300,
        resetCondition: (tag) => tag.quality === 'good' && tag.value < 295
    },
    {
        id: 'overload',
        tagId: 'TR_03_AMP',
        message: 'Перегруз (ТР_03)',
        severity: 'warning',
        triggerCondition: (tag) => tag.quality === 'good' && tag.value > 212 && tag.value < 300,
        resetCondition: (tag) => tag.quality === 'good' && (tag.value <= 210 || tag.value >= 300)
    }
];
