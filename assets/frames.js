// গিফল্যাব — shared frame-source helpers
// A "frame" is always {canvas: <canvas element>}

function loadImageFilesAsFrames(fileList, onEachFrame){
  const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
  files.forEach(file => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      onEachFrame({canvas: c});
    };
    img.src = URL.createObjectURL(file);
  });
}

function seekVideoTo(video, t){
  return new Promise(resolve => {
    function onSeeked(){ video.removeEventListener('seeked', onSeeked); resolve(); }
    video.addEventListener('seeked', onSeeked);
    video.currentTime = t;
  });
}

async function extractVideoFrames(video, start, end, fps, onProgress){
  const frames = [];
  let total = Math.floor((end - start) * fps) + 1;
  if (total > 120) total = 120;
  for (let i = 0; i < total; i++){
    const t = start + i / fps;
    if (t > video.duration) break;
    await seekVideoTo(video, t);
    const c = document.createElement('canvas');
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
    frames.push({canvas: c});
    if (onProgress) onProgress(i + 1, total);
  }
  return frames;
}

// Renders a thumbnail strip into `container`, with a delete (x) button per frame.
// `frames` is the live array (mutated in place on delete). `onChange` fires after any delete.
function renderThumbs(container, frames, onChange){
  container.innerHTML = '';
  frames.forEach((f, idx) => {
    const div = document.createElement('div');
    div.className = 'thumb';
    const img = document.createElement('img');
    img.src = f.canvas.toDataURL();
    const btn = document.createElement('button');
    btn.textContent = '×';
    btn.onclick = () => { frames.splice(idx, 1); renderThumbs(container, frames, onChange); if (onChange) onChange(); };
    div.appendChild(img); div.appendChild(btn);
    container.appendChild(div);
  });
  if (onChange) onChange();
}

// Builds a cropped+resized copy of a frame's canvas onto a new canvas of targetW x targetH.
function cropResizeFrame(frameCanvas, cropPct, targetW, targetH){
  const {l, r, t, b} = cropPct;
  const cropWFrac = 1 - (l + r) / 100;
  const cropHFrac = 1 - (t + b) / 100;
  const sx = frameCanvas.width * (l / 100);
  const sy = frameCanvas.height * (t / 100);
  const sw = frameCanvas.width * cropWFrac;
  const sh = frameCanvas.height * cropHFrac;
  const out = document.createElement('canvas');
  out.width = targetW; out.height = targetH;
  out.getContext('2d').drawImage(frameCanvas, sx, sy, sw, sh, 0, 0, targetW, targetH);
  return out;
}
