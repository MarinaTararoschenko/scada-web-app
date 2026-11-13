import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Alarm, AlarmId } from '../../models/scada.model';

@Component({
    selector: 'app-alarm-panel',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './alarm-panel.component.html',
    styleUrls: ['./alarm-panel.component.scss']
})
export class AlarmPanelComponent {
    alarms = input.required<Alarm[]>();

    acknowledge = output<{ id: AlarmId, deviceId: string }>();
}
