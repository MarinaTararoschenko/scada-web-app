import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { AlarmId } from '@models/scada.model';
import { TransformerWidgetComponent } from '@components/transformer-widget/transformer-widget.component';

@Component({
    selector: 'app-svg-schema',
    standalone: true,
    imports: [TransformerWidgetComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './svg-schema.component.html',
    styles: [`
        .schema-container {
            background: var(--ws-background-color-neutral-soft);
            padding: 20px;
            border-radius: 8px;
            border: 1px solid var(--ws-border-color-neutral-softest);
            margin-top: 20px;
        }
        h3 { color: var(--ws-text-color-neutral-soft); margin-top: 0; }
    `]
})
export class SvgSchemaComponent {
    alarmsMap = input.required<Map<string, Set<AlarmId>>>();

    public getAlarmsFor(deviceId: string): Set<AlarmId> {
        return this.alarmsMap().get(deviceId) || new Set<AlarmId>();
    }
}
