// Global array to store our copied keyframe data in memory
var copiedKeyframes = [];

/**
 * Helper function to extract the Layer ID and Attribute ID from a keyframe's path.
 * Cavalry usually returns something like "basicShape#1.position.x"
 */
function findLayerAndAttrForKeyframe(keyId) {
    let rawPath = api.getAttributeFromKeyframeId(keyId);
    if (!rawPath) return null;
    
    // Split the path into layerId and attrId
    let dotIndex = rawPath.indexOf('.');
    if (dotIndex !== -1) {
        let layerId = rawPath.substring(0, dotIndex);
        let attrId = rawPath.substring(dotIndex + 1);
        if (api.layerExists(layerId)) {
            return { layerId: layerId, attrId: attrId };
        }
    }
    
    // Fallback: If rawPath doesn't include the layer, search through currently selected layers
    let selLayers = api.getSelection();
    for (let layer of selLayers) {
        try {
            let kfIds = api.getKeyframeIdsForAttribute(layer, rawPath);
            if (kfIds && kfIds.indexOf(keyId) !== -1) {
                return { layerId: layer, attrId: rawPath };
            }
        } catch(e) {
            continue; // Ignore layers that don't have this attribute
        }
    }
    
    return null;
}

/**
 * Copies the currently selected keyframes into the global clipboard array
 */
function copyKeyframes() {
    copiedKeyframes = [];
    var keyIds = api.getSelectedKeyframeIds();
    
    if (!keyIds || keyIds.length === 0) {
        console.warn("No keyframes selected to copy.");
        return;
    }

    // Save the current playhead position so we can restore it later
    let origFrame = api.getFrame();
    let count = 0;

    for (let keyId of keyIds) {
        let loc = findLayerAndAttrForKeyframe(keyId);
        if (!loc || !loc.layerId) {
            console.warn("Could not determine layer/attribute for keyframe: " + keyId);
            continue;
        }

        let times = api.getKeyframeTimes(loc.layerId, loc.attrId);
        let kfIds = api.getKeyframeIdsForAttribute(loc.layerId, loc.attrId);
        
        // Find the exact frame time for this specific keyframe
        let frame = null;
        if (kfIds && times) {
            for (let i = 0; i < kfIds.length; i++) {
                if (kfIds[i] === keyId) {
                    frame = times[i];
                    break;
                }
            }
        }

        if (frame !== null) {
            // Move the playhead to the keyframe's time to capture its evaluated value
            api.setFrame(frame);
            let val = api.get(loc.layerId, loc.attrId);
            
            // Add to our internal clipboard
            copiedKeyframes.push({
                layerId: loc.layerId,
                attrId: loc.attrId,
                originalFrame: frame,
                value: val
            });
            count++;
        }
    }

    // Restore playhead back to where the user was
    api.setFrame(origFrame);
    console.log("Successfully copied " + count + " keyframes.");
}

/**
 * Pastes the copied keyframes starting from the current playhead time.
 * @param {boolean} reverse - If true, pastes the sequence in mirrored chronological order.
 */
function pasteKeyframes(reverse) {
    if (copiedKeyframes.length === 0) {
        return;
    }

    // Sort keyframes chronologically
    let sorted = copiedKeyframes.slice().sort((a, b) => a.originalFrame - b.originalFrame);
    
    // Find the total timing span of the copied sequence
    let baseFrame = sorted[0].originalFrame;
    let endFrame = sorted[sorted.length - 1].originalFrame;
    let duration = endFrame - baseFrame;
    
    let currentFrame = api.getFrame();
    let targetLayers = api.getSelection();
    let pastedCount = 0;

    for (let i = 0; i < sorted.length; i++) {
        let kf = sorted[i];
        let frameOffset = kf.originalFrame - baseFrame;
        
        let targetFrame;
        if (reverse) {
            // Reversing logic: Mirror the timing relative to the total duration
            targetFrame = currentFrame + (duration - frameOffset);
        } else {
            // Normal paste: apply offset to the current playhead
            targetFrame = currentFrame + frameOffset;
        }

        let targetLayerId = kf.layerId;
        
        // If the user selects a new layer, paste onto the new layer instead of the original one
        if (targetLayers.length > 0 && !targetLayers.includes(kf.layerId)) {
            targetLayerId = targetLayers[0]; 
        }

        // Format the object required by api.keyframe()
        let keyData = {};
        keyData[kf.attrId] = kf.value;
        
        try {
            api.keyframe(targetLayerId, targetFrame, keyData);
            pastedCount++;
        } catch(e) {
            console.warn("Failed to set keyframe on " + targetLayerId + " for attribute " + kf.attrId);
        }
    }
    
    console.log("Pasted " + pastedCount + " keyframes" + (reverse ? " in reverse sequence." : "."));
}

/**
 * Reverses the selected keyframes exactly where they are in the timeline.
 */
function reverseInPlace() {
    copyKeyframes();
    if (copiedKeyframes.length === 0) return;

    // First delete the original keyframes to prevent overlapping mess
    for (let kf of copiedKeyframes) {
        api.deleteKeyframe(kf.layerId, kf.attrId, kf.originalFrame);
    }

    // Sort chronologically
    let sorted = copiedKeyframes.slice().sort((a, b) => a.originalFrame - b.originalFrame);
    let baseFrame = sorted[0].originalFrame;
    let endFrame = sorted[sorted.length - 1].originalFrame;
    let duration = endFrame - baseFrame;
    
    let pastedCount = 0;

    // Now paste them back reversed at their original starting frame
    for (let kf of sorted) {
        let frameOffset = kf.originalFrame - baseFrame;
        let targetFrame = baseFrame + (duration - frameOffset);
        
        let keyData = {};
        keyData[kf.attrId] = kf.value;
        
        try {
            api.keyframe(kf.layerId, targetFrame, keyData);
            pastedCount++;
        } catch(e) {
            console.warn("Failed to set keyframe on " + kf.layerId + " for attribute " + kf.attrId);
        }
    }
    
    console.log("Reversed " + pastedCount + " keyframes in place.");
}

// --- Build the Script UI ---

ui.setTitle("Keyframe Toolkit");

var layout = new ui.VLayout();
layout.setSpaceBetween(6);
layout.setMargins(10, 10, 10, 10);

var cloneBtn = new ui.Button("Clone Selected Keyframes");
cloneBtn.onClick = function() { 
    copyKeyframes(); 
    pasteKeyframes(false); 
};

var cloneRevBtn = new ui.Button("Clone Reversed");
cloneRevBtn.onClick = function() { 
    copyKeyframes(); 
    pasteKeyframes(true); 
};

var reverseBtn = new ui.Button("Reverse Keyframes");
reverseBtn.onClick = reverseInPlace;

layout.add(cloneBtn);
layout.add(cloneRevBtn);
layout.add(reverseBtn);
layout.addStretch();

ui.add(layout);
ui.show();