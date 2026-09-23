// --- Helper Functions ---

/**
 * Safely extracts the integer value from the Cavalry NumericField.
 */
function getOffsetAmount(field) {
    var defaultVal = 10;
    try {
        if (field.value !== undefined) {
            if (typeof field.value === 'function') return parseInt(field.value()) || defaultVal;
            return parseInt(field.value) || defaultVal;
        }
    } catch(e) {}
    return defaultVal;
}


// --- Main Offset Logic ---

/**
 * Shifts layers and keyframes based on their relation to the playhead.
 * @param {boolean} isRightOfPlayhead - True if shifting items after the playhead, False for before.
 * @param {boolean} isForward - True if moving items to the right (later in time), False for left.
 */
function shiftTime(isRightOfPlayhead, isForward) {
    let amount = getOffsetAmount(amountField);
    let delta = isForward ? amount : -amount;
    let currentFrame = api.getFrame();
    
    let allLayers = api.getCompLayers(false);
    let fullyOffsetLayerIds = []; // Track layers offset entirely so we don't double-shift their keyframes
    let shiftedLayerBounds = 0;

    // 1. Process Layer In/Out Points
    for (let layer of allLayers) {
        // Option Checks
        if (ignoreLocked) {
            let locked = false;
            try { locked = api.get(layer, "locked"); } catch(e) {}
            if (locked) continue;
        }
        if (ignoreHidden) {
            if (!api.isVisible(layer, false)) continue;
        }

        let inFrame = api.getInFrame(layer);
        let outFrame = api.getOutFrame(layer);

        if (isRightOfPlayhead) {
            // Processing everything >= playhead
            if (inFrame >= currentFrame && outFrame >= currentFrame) {
                // Entire layer is to the right. Offset bounds and all its animation at once!
                api.offsetLayerTime(layer, delta);
                fullyOffsetLayerIds.push(layer);
                shiftedLayerBounds++;
            } else if (outFrame >= currentFrame && inFrame < currentFrame) {
                // Layer straddles playhead. Only stretch the out point.
                api.setOutFrame(layer, outFrame + delta);
                shiftedLayerBounds++;
            }
        } else {
            // Processing everything < playhead
            if (inFrame < currentFrame && outFrame <= currentFrame) {
                // Entire layer is to the left. Offset bounds and all its animation at once!
                api.offsetLayerTime(layer, delta);
                fullyOffsetLayerIds.push(layer);
                shiftedLayerBounds++;
            } else if (inFrame < currentFrame && outFrame > currentFrame) {
                // Layer straddles playhead. Only stretch the in point.
                api.setInFrame(layer, inFrame + delta);
                shiftedLayerBounds++;
            }
        }
    }

    // 2. Process Keyframes Autonomously
    let shiftedKeys = 0;
    
    for (let layer of allLayers) {
        // Skip if the layer was already fully shifted by api.offsetLayerTime
        if (fullyOffsetLayerIds.includes(layer)) continue;

        // Option Checks for keyframes
        if (ignoreLocked) {
            let locked = false;
            try { locked = api.get(layer, "locked"); } catch(e) {}
            if (locked) continue;
        }
        if (ignoreHidden) {
            if (!api.isVisible(layer, false)) continue;
        }

        let animAttrs = [];
        try {
            animAttrs = api.getAnimatedAttributes(layer);
        } catch(e) { continue; }

        if (!animAttrs || animAttrs.length === 0) continue;

        for (let attrId of animAttrs) {
            let times = api.getKeyframeTimes(layer, attrId);
            if (!times) continue;

            let timesToShift = [];
            for (let frame of times) {
                if (isRightOfPlayhead && frame >= currentFrame) timesToShift.push(frame);
                if (!isRightOfPlayhead && frame < currentFrame) timesToShift.push(frame);
            }

            // Sort times to prevent keyframes from overwriting each other when shifting
            if (delta > 0) {
                timesToShift.sort((a, b) => b - a); // Descending for forward shifts
            } else {
                timesToShift.sort((a, b) => a - b); // Ascending for backward shifts
            }

            for (let frame of timesToShift) {
                let newFrame = frame + delta;
                let keyData = {};
                keyData[attrId] = { "frame": frame, "newFrame": newFrame };
                try {
                    api.modifyKeyframe(layer, keyData);
                    shiftedKeys++;
                } catch(e) {}
            }
        }
    }
    
    console.log("Time Offset complete. Shifted " + shiftedLayerBounds + " layer bounds and " + shiftedKeys + " isolated keyframes.");
}


// --- Build the Script UI ---

ui.setTitle("Time Offset");
var mainLayout = new ui.VLayout();
mainLayout.setSpaceBetween(8);
mainLayout.setMargins(10, 10, 10, 10);

// Numeric Input Layout
var amtLayout = new ui.HLayout();
var amtLabel = new ui.Label("Frames to offset:");
var amountField = new ui.NumericField(10); // Default to 10 frames
amtLayout.add(amtLabel);
amtLayout.add(amountField);

// Buttons Right of Playhead
var rightLabel = new ui.Label("Right of Playhead:");
var rLayout = new ui.HLayout();
var rBwd = new ui.Button("|< Backward");
var rFwd = new ui.Button("Forward |>");
rFwd.onClick = function() { shiftTime(true, true); };
rBwd.onClick = function() { shiftTime(true, false); };
rLayout.add(rBwd);
rLayout.add(rFwd);

// Buttons Left of Playhead
var leftLabel = new ui.Label("Left of Playhead:");
var lLayout = new ui.HLayout();
var lBwd = new ui.Button("|< Backward");
var lFwd = new ui.Button("Forward >|");
lFwd.onClick = function() { shiftTime(false, true); };
lBwd.onClick = function() { shiftTime(false, false); };
lLayout.add(lBwd);
lLayout.add(lFwd);

// Filter Checkboxes (using toggle buttons for safe API compatibility)
var ignoreLocked = true;
var btnLock = new ui.Button("[x] Ignore Locked Layers");
btnLock.onClick = function() {
    ignoreLocked = !ignoreLocked;
    btnLock.setText(ignoreLocked ? "[x] Ignore Locked Layers" : "[ ] Ignore Locked Layers");
};

var ignoreHidden = true;
var btnHidden = new ui.Button("[x] Ignore Hidden Layers");
btnHidden.onClick = function() {
    ignoreHidden = !ignoreHidden;
    btnHidden.setText(ignoreHidden ? "[x] Ignore Hidden Layers" : "[ ] Ignore Hidden Layers");
};

// Assemble Window
mainLayout.add(amtLayout);
mainLayout.addSpacing(5);
mainLayout.add(rightLabel);
mainLayout.add(rLayout);
mainLayout.addSpacing(5);
mainLayout.add(leftLabel);
mainLayout.add(lLayout);
mainLayout.addSpacing(10);
mainLayout.add(btnLock);
mainLayout.add(btnHidden);
mainLayout.addStretch();

ui.add(mainLayout);
ui.show();