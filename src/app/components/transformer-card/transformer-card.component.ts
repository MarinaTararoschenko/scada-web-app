import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { ScadaDataService } from '@services/scada-data.service';
import { AlarmId } from '@models/scada.model';

@Component({
    selector: 'app-transformer-card',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './transformer-card.component.html',
    styleUrls: ['./transformer-card.component.scss']
})
export class TransformerCardComponent {
    private scadaService = inject(ScadaDataService);

    // Input properties passed from the parent component
    deviceId = input.required<string>();
    alarmsMap = input.required<Map<string, Set<AlarmId>>>();

    /**
     * Extracts the set of active alarms specifically for this device.
     * Returns an empty Set if no alarms are present for the device.
     */
    private alarmsList = computed(() =>
        this.alarmsMap().get(this.deviceId()) || new Set<AlarmId>()
    );

    // Subscribing to granular tag signals for real-time values
    ampValue = computed(() => this.scadaService.getTagSignal(`${this.deviceId()}_AMP`)().value);
    voltValue = computed(() => this.scadaService.getTagSignal(`${this.deviceId()}_VOLT`)().value);

    // Evaluating specific fault conditions based on active alarms
    hasShortCircuit = computed(() => this.alarmsList().has('sc'));
    hasOverload = computed(() => this.alarmsList().has('overload'));
    hasOvervoltage = computed(() => this.alarmsList().has('overvoltage'));
    hasUndervoltage = computed(() => this.alarmsList().has('undervoltage'));

    // Dynamic styling based on severity (ISA-101 principles)
    cardBorder = computed(() => {
        if (this.hasShortCircuit() || this.hasOvervoltage()) return '2px solid #ff5252'; // Critical
        if (this.hasOverload() || this.hasUndervoltage()) return '2px solid #ffeb3b';      // Warning
        return '1px solid #333';                                                          // Normal
    });

    ampColor = computed(() => {
        if (this.hasShortCircuit()) return '#ff5252';
        if (this.hasOverload()) return '#ffeb3b';
        return '#00bcd4';
    });

    voltColor = computed(() => {
        if (this.hasShortCircuit() || this.hasOvervoltage()) return '#ff5252';
        if (this.hasUndervoltage()) return '#ffeb3b';
        return '#4caf50';
    });
}
