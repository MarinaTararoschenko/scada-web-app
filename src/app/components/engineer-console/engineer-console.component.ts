import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ScadaDataService } from '../../services/scada-data.service';
import { AlarmId } from '../../models/scada.model';
import { SvgSchemaComponent } from '../../components/svg-schema/svg-schema.component';
import { TransformerCardComponent } from '../../components/transformer-card/transformer-card.component';
import { AlarmPanelComponent } from '../../components/alarm-panel/alarm-panel.component';

@Component({
    selector: 'app-engineer-console',
    imports: [SvgSchemaComponent, TransformerCardComponent, AlarmPanelComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './engineer-console.component.html',
    styleUrl: './engineer-console.component.scss'
})
export class EngineerConsoleComponent {
    public scadaService = inject(ScadaDataService);

    // Expose service signals to the template
    public alarms = this.scadaService.alarms;
    public connectionStatus = this.scadaService.connectionStatus;
    public tagsCount = this.scadaService.tagsCount;

    private readonly deviceIds = ['TR_01', 'TR_02', 'TR_03'];

    /**
     * Maps active alarms to their respective devices.
     * Creates a Map where keys are device IDs (e.g., 'TR_01')
     * and values are Sets of active alarm IDs for that device.
     */
    public alarmsMap = computed(() => {
        const map = new Map<string, Set<AlarmId>>();

        // Initialize with empty Sets for all known devices
        for (const id of this.deviceIds) {
            map.set(id, new Set<AlarmId>());
        }

        // Populate Sets with active alarms
        for (const alarm of this.alarms()) {
            if (alarm.isActive) {
                const set = map.get(alarm.deviceId);
                if (set) set.add(alarm.id);
            }
        }
        return map;
    });

    // Debug panel state
    public showDebug = signal(false);
    public latestTagsJson = computed(() => JSON.stringify(this.scadaService.getSnapshot(), null, 2));

    /**
     * Toggles the visibility of the debug JSON panel.
     */
    public toggleDebug() {
        this.showDebug.update(v => !v);
    }

    /**
     * Acknowledges a specific alarm for a specific device.
     */
    public acknowledgeAlarm(id: AlarmId, deviceId: string) {
        this.scadaService.acknowledgeAlarm(id, deviceId);
    }
}
