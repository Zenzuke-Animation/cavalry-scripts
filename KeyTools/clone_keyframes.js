/**
 * Clones selected keyframes and pastes them starting at the current playhead position.
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

    // 2. Paste at Playhead
    if (copiedKeyframes.length > 0) {
        let sorted = copiedKeyframes.slice().sort((a, b) => a.originalFrame - b.originalFrame);
        let baseFrame = sorted[0].originalFrame;
        let targetLayers = api.getSelection();
        let pastedCount = 0;

        for (let kf of sorted) {
            let frameOffset = kf.originalFrame - baseFrame;
            let targetFrame = origFrame + frameOffset;
            
            let targetLayerId = kf.layerId;
            if (targetLayers.length > 0 && !targetLayers.includes(kf.layerId)) {
                targetLayerId = targetLayers[0]; 
            }
            
            let keyData = {};
            keyData[kf.attrId] = kf.value;
            try {
                api.keyframe(targetLayerId, targetFrame, keyData);
                pastedCount++;
            } catch(e) {}
        }
        console.log("Cloned " + pastedCount + " keyframes.");
    }
} else {
    console.warn("No keyframes selected to clone.");
}