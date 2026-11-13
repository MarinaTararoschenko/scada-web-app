import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { ScadaDataService } from '@services/scada-data.service';
import { AlarmId } from '@models/scada.model';

@Component({
    selector: 'g[app-transformer-widget]',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <svg:line x1="0" y1="0" x2="0" y2="-40" [attr.stroke]="voltageLineColor()" stroke-width="4" />

        <svg:g transform="translate(0, -40)">
            <svg:circle cx="0" cy="0" r="4" fill="#ddd" />
            <svg:circle cx="0" cy="-30" r="4" fill="#ddd" />
            <svg:line x1="0" y1="0" x2="0" y2="-30"
                      [attr.stroke]="breakerColor()"
                      stroke-width="4"
                      [attr.transform]="isShortCircuit() ? 'rotate(30)' : ''" />
        </svg:g>

        <svg:line x1="0" y1="-70" x2="0" y2="-85" [attr.stroke]="voltageLineColor()" stroke-width="4" />
        <svg:circle cx="0" cy="-115" r="25" fill="none" [attr.stroke]="voltageLineColor()" stroke-width="4" />
        <svg:circle cx="0" cy="-156" r="25" fill="none" [attr.stroke]="voltageLineColor()" stroke-width="4" />

        <svg:text x="0" y="30" fill="#aaa" font-size="14" text-anchor="middle">{{ deviceId() }}</svg:text>
        <svg:text x="0" y="50" [attr.fill]="ampArrowColor()" font-size="14" text-anchor="middle">{{ ampValue() }} A</svg:text>
        <svg:text x="0" y="70" [attr.fill]="voltageLineColor()" font-size="14" text-anchor="middle">{{ voltageValue() }} kV</svg:text>
    `
})
export class TransformerWidgetComponent {
    private scadaService = inject(ScadaDataService);

    deviceId = input.required<string>();
    activeAlarms = input.required<Set<AlarmId>>();

    // Fetching granular signals for this specific transformer
    ampTag = computed(() => this.scadaService.getTagSignal(`${this.deviceId()}_AMP`)());
    voltTag = computed(() => this.scadaService.getTagSignal(`${this.deviceId()}_VOLT`)());

    // Extracting values and validating signal quality
    ampValue = computed(() => this.ampTag().value);
    voltageValue = computed(() => this.voltTag().value);
    isDataValid = computed(() => this.ampTag().quality === 'good' && this.voltTag().quality === 'good');

    // Determining active fault states
    isOverload = computed(() => this.activeAlarms().has('overload'));
    isShortCircuit = computed(() => this.activeAlarms().has('sc'));
    isUndervoltage = computed(() => this.activeAlarms().has('undervoltage'));
    isOvervoltage = computed(() => this.activeAlarms().has('overvoltage'));

    // Visual state of the breaker (opens on short circuit)
    breakerColor = computed(() => this.isShortCircuit() ? '#ff5252' : '#4caf50');

    // Dynamic colors based on the severity of the current state
    ampArrowColor = computed(() => {
        if (!this.isDataValid()) return '#777777'; // Invalid data
        if (this.isShortCircuit()) return '#ff5252'; // Critical
        if (this.isOverload()) return '#ffeb3b';     // Warning
        return '#00bcd4';                            // Normal
    });

    voltageLineColor = computed(() => {
        if (!this.isDataValid()) return '#777777';
        if (this.isShortCircuit() || this.isOvervoltage()) return '#ff5252';
        if (this.isUndervoltage()) return '#ffeb3b';
        return '#4caf50';
    });
}
