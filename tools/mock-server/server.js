import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({
    port: 8081,
    maxPayload: 50 * 1024,
});

console.log('🏭 SCADA Mock Server started on ws://localhost:8081');

const STATES = [
    { name: 'NORMAL',        current: 210, voltage: 10.30 }, // Index 0 — normal operation
    { name: 'OVERLOAD',      current: 220, voltage: 10.30 }, // Indices 1..4 — fault conditions
    { name: 'SHORT_CIRCUIT', current: 310, voltage: 9.80  },
    { name: 'UNDERVOLTAGE',  current: 210, voltage: 9.90  },
    { name: 'OVERVOLTAGE',   current: 210, voltage: 10.70 },
];

// All transformers start in NORMAL state
const devices = {
    'TR_01': { stateIndex: 0 },
    'TR_02': { stateIndex: 0 },
    'TR_03': { stateIndex: 0 },
};

const deviceIds = Object.keys(devices);
let currentDeviceIndex = 0; // Index of the current transformer for a fault
let currentFaultIndex = 1;  // Index of the current fault state (1 to 4)

const FAULT_DURATION = 8000; // Fault duration: 8 seconds
const PAUSE_BETWEEN = 3000;  // Pause in normal mode between faults: 3 seconds

// Sequential fault dispatcher (prevents simultaneous faults on different transformers)
function scheduleNextFault() {
    const devId = deviceIds[currentDeviceIndex];
    const faultState = STATES[currentFaultIndex];

    // Set the selected transformer to the fault state
    devices[devId].stateIndex = currentFaultIndex;
    console.log(`🚨 FAULT on ${devId}: [${faultState.name}] (current ~${faultState.current} A, voltage ~${faultState.voltage} kV)`);

    // Return the transformer to NORMAL state after 8 seconds
    setTimeout(() => {
        devices[devId].stateIndex = 0;
        console.log(`✅ ${devId} returned to [NORMAL]`);

        // Move to the next transformer
        currentDeviceIndex = (currentDeviceIndex + 1) % deviceIds.length;

        // When all three transformers have gone through the current fault, take the next fault type
        if (currentDeviceIndex === 0) {
            currentFaultIndex++;
            if (currentFaultIndex >= STATES.length) {
                currentFaultIndex = 1;
            }
        }

        // Wait 3 seconds before the next fault
        setTimeout(scheduleNextFault, PAUSE_BETWEEN);
    }, FAULT_DURATION);
}

// Start the first fault 3 seconds after server startup
setTimeout(scheduleNextFault, PAUSE_BETWEEN);

function jitter(base, amp = 0.05) {
    return parseFloat((base + (Math.random() - 0.5) * 2 * amp).toFixed(2));
}

function getQuality() {
    return Math.random() > 0.005 ? 'good' : 'bad';
}

wss.on('connection', (ws) => {
    console.log('🔌 Client (Angular) connected');

    // Realistic high-frequency stream (100 packets per second) to test client-side throttling
    const intervalId = setInterval(() => {
        if (ws.readyState !== ws.OPEN) return;

        const now = Date.now();
        const tagsPackage = [];

        for (const [devId, dev] of Object.entries(devices)) {
            const state = STATES[dev.stateIndex];

            tagsPackage.push(
                {
                    id: `${devId}_AMP`,
                    value: jitter(state.current),
                    quality: getQuality(),
                    timestamp: now,
                },
                {
                    id: `${devId}_VOLT`,
                    value: jitter(state.voltage),
                    quality: getQuality(),
                    timestamp: now,
                }
            );
        }

        ws.send(JSON.stringify(tagsPackage));
    }, 10);

    ws.on('close', () => {
        console.log('❌ Client disconnected');
        clearInterval(intervalId);
    });

    ws.on('error', (err) => {
        console.error('Socket error:', err);
        clearInterval(intervalId);
    });
});
