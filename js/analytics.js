export function trackNodeAdded(nodeName) {
    try {
        const amp = window?.amplitude;
        const props = { 'node name': nodeName };
        if (amp?.track) {
            amp.track('node added', props);
        } else if (amp?.getInstance) {
            amp.getInstance().logEvent?.('node added', props);
        }
    } catch (err) {
        console.warn('Failed to track node added', err);
    }
}

export function trackExportButtonClick() {
    try {
        const amp = window?.amplitude;
        if (amp?.track) {
            amp.track('export button clicked');
        } else if (amp?.getInstance) {
            amp.getInstance().logEvent?.('export button clicked');
        }
    } catch (err) {
        console.warn('Failed to track export button click', err);
    }
}

export function trackAppLaunched() {
    try {
        const amp = window?.amplitude;
        if (amp?.track) {
            amp.track('App Launched');
        } else if (amp?.getInstance) {
            amp.getInstance().logEvent?.('App Launched');
        }
    } catch (err) {
        console.warn('Failed to track App Launched', err);
    }
}
