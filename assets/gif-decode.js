// গিফল্যাব — GIF decoder (composites delta frames into full frame canvases)
// Requires assets/gifuct.js to be loaded first (provides the global GIFUCT object)

// Returns: Promise<{width, height, loopCount, frames: [{canvas, delay}]}>
async function decodeGifToFrames(file){
  const buf = await file.arrayBuffer();
  const gifData = GIFUCT.parseGIF(buf);
  const rawFrames = GIFUCT.decompressFrames(gifData, true);
  const width = gifData.lsd.width, height = gifData.lsd.height;

  const composite = document.createElement('canvas');
  composite.width = width; composite.height = height;
  const cctx = composite.getContext('2d');

  let savedImageData = null;
  let prevDisposal = 0;
  let prevRect = null;
  const outFrames = [];

  for(const frame of rawFrames){
    // Handle disposal of the PREVIOUS frame before drawing this one
    if(prevDisposal === 2 && prevRect){
      cctx.clearRect(prevRect.left, prevRect.top, prevRect.width, prevRect.height);
    } else if(prevDisposal === 3 && savedImageData){
      cctx.putImageData(savedImageData, 0, 0);
    }

    // If THIS frame needs "restore to previous" disposal, save canvas state now
    if(frame.disposalType === 3){
      savedImageData = cctx.getImageData(0, 0, width, height);
    }

    // Draw this frame's patch (delta region) onto the composite canvas
    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = frame.dims.width;
    patchCanvas.height = frame.dims.height;
    const pctx = patchCanvas.getContext('2d');
    const imgData = pctx.createImageData(frame.dims.width, frame.dims.height);
    imgData.data.set(frame.patch);
    pctx.putImageData(imgData, 0, 0);
    cctx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);

    // Snapshot the fully-composited frame
    const snap = document.createElement('canvas');
    snap.width = width; snap.height = height;
    snap.getContext('2d').drawImage(composite, 0, 0);
    outFrames.push({canvas: snap, delay: frame.delay || 100});

    prevDisposal = frame.disposalType;
    prevRect = {left: frame.dims.left, top: frame.dims.top, width: frame.dims.width, height: frame.dims.height};
  }

  return {width, height, frames: outFrames};
}
