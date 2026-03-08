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

export function trackOpenedTemplate(templateName) {
    try {
        const amp = window?.amplitude;
        const props = { 'template name': templateName };
        if (amp?.track) {
            amp.track('Opened Template', props);
        } else if (amp?.getInstance) {
            amp.getInstance().logEvent?.('Opened Template', props);
        }
    } catch (err) {
        console.warn('Failed to track Opened Template', err);
    }
}

export function trackLoggedIn(name) {
    try {
        const amp = window?.amplitude;
        if (amp?.setUserId) {
            amp.setUserId(name);
        } else if (amp?.getInstance) {
            amp.getInstance().setUserId?.(name);
        }
        if (amp?.track) {
            amp.track('Logged In');
        } else if (amp?.getInstance) {
            amp.getInstance().logEvent?.('Logged In');
        }
    } catch (err) {
        console.warn('Failed to track Logged In', err);
    }
}

export function trackSaveDiagram(diagramName) {
    try {
        const amp = window?.amplitude;
        const props = { 'diagram name': diagramName };
        if (amp?.track) {
            amp.track('Save Diagram', props);
        } else if (amp?.getInstance) {
            amp.getInstance().logEvent?.('Save Diagram', props);
        }
    } catch (err) {
        console.warn('Failed to track Save Diagram', err);
    }
}

export function trackLoggedOut() {
    try {
        const amp = window?.amplitude;
        if (amp?.track) {
            amp.track('Logged Out');
        } else if (amp?.getInstance) {
            amp.getInstance().logEvent?.('Logged Out');
        }
    } catch (err) {
        console.warn('Failed to track Logged Out', err);
    }
}

export function trackOpenDiagram(diagramName) {
    try {
        const amp = window?.amplitude;
        const props = { 'diagram name': diagramName };
        if (amp?.track) {
            amp.track('Open Diagram', props);
        } else if (amp?.getInstance) {
            amp.getInstance().logEvent?.('Open Diagram', props);
        }
    } catch (err) {
        console.warn('Failed to track Open Diagram', err);
    }
}
