/**
 * Reverses the selected keyframes chronologically exactly where they sit on the timeline.
 */
function findLayerAndAttrForKeyframe(keyId) {
    let rawPath = api.getAttributeFromKeyframeId(keyId);
    if (!rawPath) return null;
    let dotIndex = rawPath.indexOf('.');
    if (dotIndex !== -1) {
        let layerId = rawPath.substring(0, dotIndex);
        let attrId = rawPath.substring(dotIndex + 1);
        if (api.layerExists(layerId)) return { layerId: layerId, attrId: attrId };
    }
    let selLayers = api.getSelection();
    for (let layer of selLayers) {
        try {
            let kfIds = api.getKeyframeIdsForAttribute(layer, rawPath);
            if (kfIds && kfIds.indexOf(keyId) !== -1) return { layerId: layer, attrId: rawPath };
        } catch(e) { continue; }
    }
    return null;
}

var keyIds = api.getSelectedKeyframeIds();
if (keyIds && keyIds.length > 0) {
    var copiedKeyframes = [];
    let origFrame = api.getFrame();
    
    // 1. Copy Values
    for (let keyId of keyIds) {
        let loc = findLayerAndAttrForKeyframe(keyId);
        if (!loc || !loc.layerId) continue;
        
        let times = api.getKeyframeTimes(loc.layerId, loc.attrId);
        let kfIds = api.getKeyframeIdsForAttribute(loc.layerId, loc.attrId);
        let frame = null;
        
        if (kfIds && times) {
            for (let i = 0; i < kfIds.length; i++) {
                if (kfIds[i] === keyId) { frame = times[i]; break; }
            }
        }
        
        if (frame !== null) {
            api.setFrame(frame);
            copiedKeyframes.push({
                layerId: loc.layerId,
                attrId: loc.attrId,
                originalFrame: frame,
                value: api.get(loc.layerId, loc.attrId)
            });
        }
    }
    api.setFrame(origFrame); // Restore playhead

    if (copiedKeyframes.length > 0) {
        // 2. Delete original keyframes to prevent overlaps
        for (let kf of copiedKeyframes) {
            api.deleteKeyframe(kf.layerId, kf.attrId, kf.originalFrame);
        }

        // 3. Paste Reversed at their original start time
        let sorted = copiedKeyframes.slice().sort((a, b) => a.originalFrame - b.originalFrame);
        let baseFrame = sorted[0].originalFrame;
        let endFrame = sorted[sorted.length - 1].originalFrame;
        let duration = endFrame - baseFrame;
        let pastedCount = 0;

        for (let kf of sorted) {
            let frameOffset = kf.originalFrame - baseFrame;
            // Paste starting at the original baseFrame, but reverse the offsets
            let targetFrame = baseFrame + (duration - frameOffset);
            
            let keyData = {};
            keyData[kf.attrId] = kf.value;
            try {
                api.keyframe(kf.layerId, targetFrame, keyData);
                pastedCount++;
            } catch(e) {}
        }
        console.log("Reversed " + pastedCount + " keyframes in place.");
    }
} else {
    console.warn("No keyframes selected to reverse.");
}