import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import './App.css';


function hexToRgba(hex, opacity = 100) {
  const c = hex.replace('#', '');
  if (c.length !== 6) return hex;
  return `rgba(${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)},${opacity / 100})`;
}

function mixHexColors(color1, color2, weight) {
  const c1 = color1.replace('#', '');
  const c2 = color2.replace('#', '');
  const r1 = parseInt(c1.slice(0, 2), 16); const g1 = parseInt(c1.slice(2, 4), 16); const b1 = parseInt(c1.slice(4, 6), 16);
  const r2 = parseInt(c2.slice(0, 2), 16); const g2 = parseInt(c2.slice(2, 4), 16); const b2 = parseInt(c2.slice(4, 6), 16);
  const r = Math.round(r1 + (r2 - r1) * weight);
  const g = Math.round(g1 + (g2 - g1) * weight);
  const b = Math.round(b1 + (b2 - b1) * weight);
  const toHex = (val) => val.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}


function buildSmoothedStops(stops) {
  if (stops.length < 2) return stops.map(s => ({ color: s.color, opacity: s.opacity, position: s.position }));
  const result = [];
  for (let i = 0; i < stops.length; i++) {
    result.push({ color: stops[i].color, opacity: stops[i].opacity, position: stops[i].position });
    if (i < stops.length - 1) {
      const a = stops[i], b = stops[i + 1];
      for (const t of [0.25, 0.5, 0.75]) {
        const pos = a.position + (b.position - a.position) * t;
        const color = mixHexColors(a.color, b.color, t);
        const opacity = a.opacity + (b.opacity - a.opacity) * t;
        result.push({ color, opacity, position: pos });
      }
    }
  }
  return result;
}

function buildSmoothedCssStops(stops) {
  return buildSmoothedStops(stops).map(s => `${hexToRgba(s.color, s.opacity)} ${s.position.toFixed(1)}%`);
}



function App() {
  const gradientTypes = ['Linear', 'Radial', 'Conic', 'Freeform'];
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [aspectRatio, setAspectRatio] = useState('4:3');
  const [freeWidth, setFreeWidth] = useState(1920);
  const [freeHeight, setFreeHeight] = useState(1080);
  const [gradientType, setGradientType] = useState('Linear');
  const [angle, setAngle] = useState(90);
  const [centerX, setCenterX] = useState(50);
  const [centerY, setCenterY] = useState(50);
  const [animationDuration, setAnimationDuration] = useState(8);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [isAnimated, setIsAnimated] = useState(false);
  const [blur, setBlur] = useState(0);
  const [noise, setNoise] = useState(0);
  const [activeStopId, setActiveStopId] = useState(1);
  const [colorStops, setColorStops] = useState([
    { id: 1, color: '#490025', position: 0, opacity: 100 },
    { id: 2, color: '#ff2d24', position: 100, opacity: 100 },
  ]);

  const activeStop = colorStops.find((s) => s.id === activeStopId) || colorStops[0];
  const sortedStops = useMemo(() => [...colorStops].sort((a, b) => a.position - b.position), [colorStops]);

  const gradientCssTracker = useMemo(() => {
    const stops = sortedStops.map((s) => `${hexToRgba(s.color, s.opacity)} ${s.position}%`).join(', ');
    return `linear-gradient(90deg, ${stops})`;
  }, [sortedStops]);

  const gradientCss = useMemo(() => {
    const stops = buildSmoothedCssStops(sortedStops).join(', ');
    if (gradientType === 'Linear') return `linear-gradient(${angle}deg, ${stops})`;
    if (gradientType === 'Radial') return `radial-gradient(circle at ${centerX}% ${centerY}%, ${stops})`;
    if (gradientType === 'Conic') return `conic-gradient(from ${angle}deg at ${centerX}% ${centerY}%, ${stops})`;
    return [
      `radial-gradient(circle at 20% 30%, ${hexToRgba(sortedStops[0]?.color || '#490025', sortedStops[0]?.opacity || 100)} 0%, transparent 35%)`,
      `radial-gradient(circle at 80% 20%, ${hexToRgba(sortedStops[1]?.color || '#ff2d24', sortedStops[1]?.opacity || 100)} 0%, transparent 35%)`,
      sortedStops[2] ? `radial-gradient(circle at 50% 80%, ${hexToRgba(sortedStops[2].color, sortedStops[2].opacity)} 0%, transparent 40%)` : null,
      `linear-gradient(135deg, ${sortedStops.map((s) => hexToRgba(s.color, s.opacity)).join(', ')})`,
    ].filter(Boolean).join(', ');
  }, [sortedStops, gradientType, angle, centerX, centerY]);

  function updateColorStop(id, key, value) {
    setColorStops((cur) => cur.map((s) => s.id === id ? { ...s, [key]: value } : s));
  }

  function addColorStop() {
    const currentIndex = sortedStops.findIndex(s => s.id === activeStopId);
    const currentStop = sortedStops[currentIndex] || sortedStops[0];
    let newPosition = 50;
    let leftStop = null;
    let rightStop = null;

    if (sortedStops.length === 1) {
      newPosition = Math.min(currentStop.position + 15, 100);
      leftStop = currentStop; rightStop = currentStop;
    } else if (currentIndex === sortedStops.length - 1) {
      leftStop = sortedStops[currentIndex - 1]; rightStop = currentStop;
      newPosition = Math.round(leftStop.position + (rightStop.position - leftStop.position) / 2);
    } else {
      leftStop = currentStop; rightStop = sortedStops[currentIndex + 1];
      newPosition = Math.round(leftStop.position + (rightStop.position - leftStop.position) / 2);
    }

    if (colorStops.some(s => s.position === newPosition)) newPosition = Math.min(newPosition + 1, 100);

    let t = 0.5;
    const posDiff = rightStop.position - leftStop.position;
    if (posDiff > 0) t = (newPosition - leftStop.position) / posDiff;

    const newColor = mixHexColors(leftStop.color, rightStop.color, t);
    const newOpacity = Math.round(leftStop.opacity + (rightStop.opacity - leftStop.opacity) * t);
    const newId = Date.now();
    setColorStops((cur) => [...cur, { id: newId, color: newColor, position: newPosition, opacity: newOpacity }]);
    setActiveStopId(newId);
  }

  function removeColorStop(id) {
    if (colorStops.length <= 2) return;
    const next = colorStops.filter((s) => s.id !== id);
    setColorStops(next);
    if (activeStopId === id) setActiveStopId(next[0].id);
  }

  function duplicateColorStop(id) {
    const s = colorStops.find((s) => s.id === id);
    if (!s) return;
    const n = { ...s, id: Date.now(), position: Math.min(s.position + 10, 100) };
    setColorStops((cur) => [...cur, n]);
    setActiveStopId(n.id);
  }

  const [showExportModal, setShowExportModal] = useState(false);

  return (
    <div className="app" dir="rtl">
      {isSidebarOpen ? (
        <SideBar
          onClose={() => setIsSidebarOpen(false)}
          gradientTypes={gradientTypes} gradientType={gradientType} setGradientType={setGradientType}
          aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
          freeWidth={freeWidth} setFreeWidth={setFreeWidth} freeHeight={freeHeight} setFreeHeight={setFreeHeight}
          angle={angle} setAngle={setAngle} centerX={centerX} setCenterX={setCenterX} centerY={centerY} setCenterY={setCenterY}
          animationDuration={animationDuration} setAnimationDuration={setAnimationDuration}
          animationSpeed={animationSpeed} setAnimationSpeed={setAnimationSpeed}
          isAnimated={isAnimated} setIsAnimated={setIsAnimated}
          blur={blur} setBlur={setBlur} noise={noise} setNoise={setNoise}
          activeStopId={activeStopId} setActiveStopId={setActiveStopId}
          colorStops={colorStops} activeStop={activeStop} sortedStops={sortedStops} gradientCss={gradientCss} gradientCssTracker={gradientCssTracker}
          updateColorStop={updateColorStop} addColorStop={addColorStop}
          removeColorStop={removeColorStop} duplicateColorStop={duplicateColorStop}
          onOpenExport={() => setShowExportModal(true)}
        />
      ) : (
        <button className="open-sidebar-btn" onClick={() => setIsSidebarOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      )}
      <Preview gradientCss={gradientCss} aspectRatio={aspectRatio} freeWidth={freeWidth} freeHeight={freeHeight} animationDuration={animationDuration} animationSpeed={animationSpeed} isAnimated={isAnimated} blur={blur} noise={noise} />
      {showExportModal && (
        <ExportModal
          gradientCss={gradientCss} sortedStops={sortedStops} gradientType={gradientType}
          angle={angle} centerX={centerX} centerY={centerY}
          animationDuration={animationDuration} animationSpeed={animationSpeed} isAnimated={isAnimated}
          aspectRatio={aspectRatio} freeWidth={freeWidth} freeHeight={freeHeight}
          blur={blur} noise={noise}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}



function SideBar({ onClose, gradientTypes, gradientType, setGradientType, aspectRatio, setAspectRatio, freeWidth, setFreeWidth, freeHeight, setFreeHeight, angle, setAngle, centerX, setCenterX, centerY, setCenterY, animationDuration, setAnimationDuration, animationSpeed, setAnimationSpeed, isAnimated, setIsAnimated, blur, setBlur, noise, setNoise, activeStopId, setActiveStopId, colorStops, activeStop, sortedStops, gradientCss, gradientCssTracker, updateColorStop, addColorStop, removeColorStop, duplicateColorStop, onOpenExport }) {
  const [showMenu, setShowMenu] = useState(false);
  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <button className="icon-button close-sidebar" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
        <div className="title-wrap"><span className="red-dot" /><h2>יצירת גרדיאנט</h2></div>
        <div className="menu-container">
          <button className={`menu-button ${showMenu ? 'active' : ''}`} onClick={() => setShowMenu(!showMenu)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2.5"></circle><circle cx="12" cy="12" r="2.5"></circle><circle cx="19" cy="12" r="2.5"></circle></svg>
          </button>
          {showMenu && (
            <div className="export-dropdown">
              <button onClick={() => { setShowMenu(false); onOpenExport(); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                <div className="option-text"><strong>הורד</strong><span>{isAnimated ? 'אנימציה' : 'תמונה'}</span></div>
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="sidebar-content">
        <SidebarSection title="סוג גרדיאנט" headerRight={<div className="current-value">{gradientType}</div>}>
          <div className="gradient-type-selector">
            {gradientTypes.map((type) => (
              <button key={type} type="button" onClick={() => setGradientType(type)} className={`type-tab-button ${type === gradientType ? 'active' : ''}`}>
                {type === 'Linear' && 'קווים (Linear)'}{type === 'Radial' && 'מעגלי (Radial)'}{type === 'Conic' && 'זוויתי (Conic)'}{type === 'Freeform' && 'חופשי (Freeform)'}
              </button>
            ))}
          </div>
        </SidebarSection>

        <SidebarSection title="יחס קצוות" headerRight={<div className="current-value">{aspectRatio}</div>}>
          <div className="aspect-ratio-grid">
            {[
              { label: 'Free', value: 'Free', w: 28, h: 28 },
              { label: '1:1', value: '1:1', w: 28, h: 28 },
              { label: '4:3', value: '4:3', w: 34, h: 25 },
              { label: '3:4', value: '3:4', w: 25, h: 34 },
              { label: '16:9', value: '16:9', w: 36, h: 20 },
              { label: '9:16', value: '9:16', w: 20, h: 36 },
              { label: '5:4', value: '5:4', w: 32, h: 26 },
              { label: '4:5', value: '4:5', w: 26, h: 32 },
              { label: 'A3', value: 'A3', w: 23, h: 33 },
            ].map((ratio) => (
              <button key={ratio.value} type="button" className={`ratio-card-button ${aspectRatio === ratio.value ? 'active' : ''}`} onClick={() => setAspectRatio(ratio.value)}>
                <span className="ratio-thumb-wrap"><span className="ratio-thumb" style={{ width: ratio.w, height: ratio.h }} /></span>
                <span className="ratio-label">{ratio.label}</span>
              </button>
            ))}
          </div>
          {aspectRatio === 'Free' && (
            <div className="free-size-inputs">
              <div className="free-size-field"><label>רוחב (px)</label><input type="number" min="100" max="4000" value={freeWidth} onChange={(e) => setFreeWidth(Number(e.target.value))} /></div>
              <div className="free-size-field"><label>גובה (px)</label><input type="number" min="100" max="4000" value={freeHeight} onChange={(e) => setFreeHeight(Number(e.target.value))} /></div>
            </div>
          )}
        </SidebarSection>

        <SidebarSection title="צבעים" headerRight={<div className="current-value">{colorStops.length} נקודות</div>}>
          <GradientColorEditor
            colorStops={colorStops} activeStopId={activeStopId} activeStop={activeStop}
            gradientCss={gradientCss} gradientCssTracker={gradientCssTracker}
            onSelectStop={setActiveStopId} onUpdateStop={updateColorStop}
            onAddStop={addColorStop} onRemoveStop={removeColorStop} onDuplicateStop={duplicateColorStop}
          />
        </SidebarSection>

        <SidebarSection title="מיקום וזווית">
          {(gradientType === 'Linear' || gradientType === 'Conic') && <SliderRow label="זווית" value={`${angle}°`} defaultValue={angle} minValue={0} maxValue={360} onChange={setAngle} />}
          {(gradientType === 'Radial' || gradientType === 'Conic') && (<><SliderRow label="מרכז X" value={`${centerX}%`} defaultValue={centerX} minValue={0} maxValue={100} onChange={setCenterX} /><SliderRow label="מרכז Y" value={`${centerY}%`} defaultValue={centerY} minValue={0} maxValue={100} onChange={setCenterY} /></>)}
        </SidebarSection>

        <SidebarSection title="סגנון">
          <SliderRow label="טשטוש קצוות (Blur)" value={`${blur}px`} defaultValue={blur} minValue={0} maxValue={80} onChange={setBlur} />
          <SliderRow label="רעש (Noise)" value={`${noise}%`} defaultValue={noise} minValue={0} maxValue={100} onChange={setNoise} />
        </SidebarSection>

        <SidebarSection title="אנימציה">
          <div className="anim-toggle-row">
            <button type="button" className={`anim-toggle-btn ${!isAnimated ? 'active' : ''}`} onClick={() => setIsAnimated(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
              סטטי
            </button>
            <button type="button" className={`anim-toggle-btn ${isAnimated ? 'active' : ''}`} onClick={() => setIsAnimated(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              אנימציה
            </button>
          </div>
          {isAnimated && (<><SliderRow label="משך זמן" value={`${animationDuration}s`} defaultValue={animationDuration} minValue={1} maxValue={30} onChange={setAnimationDuration} /><SliderRow label="עוצמת תנועה" value={`${animationSpeed}x`} defaultValue={animationSpeed} minValue={0.25} maxValue={4} step={0.25} onChange={setAnimationSpeed} /></>)}
        </SidebarSection>
      </div>
    </aside>
  );
}


const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;


const IMAGE_FORMATS = [
  { id: 'png', label: 'PNG', description: 'איכות מקסימלית, שקיפות', mime: 'image/png', ext: 'png', quality: null },
  { id: 'jpeg', label: 'JPEG', description: 'קובץ קטן, לתמונות', mime: 'image/jpeg', ext: 'jpg', quality: 0.92 },
  { id: 'webp', label: 'WebP', description: 'מודרני, גם שקיפות', mime: 'image/webp', ext: 'webp', quality: 0.92 },
  { id: 'svg', label: 'SVG', description: 'וקטורי, גודל חופשי', mime: 'image/svg+xml', ext: 'svg', quality: null },
];

const VIDEO_FORMATS = [
  { id: 'webm', label: 'WebM', description: 'תמיכה רחבה בדפדפנים', mime: 'video/webm', ext: 'webm' },
  { id: 'mp4', label: 'MP4', description: 'תואם לכל מכשיר', mime: 'video/mp4', ext: 'mp4', fallbackMime: 'video/webm' },
];

function ExportModal({ gradientCss, sortedStops, gradientType, angle, centerX, centerY, animationDuration, animationSpeed, isAnimated, aspectRatio, freeWidth, freeHeight, blur, noise, onClose }) {
  const previewRef = useRef(null);
  const fillRef = useRef(null);
  const thumbRef = useRef(null);
  const timeRef = useRef(null);
  const seekBarRef = useRef(null);
  const rafRef = useRef(null);
  const clockRef = useRef(0);
  const lastTsRef = useRef(null);
  const isPlayingRef = useRef(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatusText, setExportStatusText] = useState('');
  const effectiveDuration = animationDuration;

  const [selectedImageFormat, setSelectedImageFormat] = useState('png');
  const [selectedVideoFormat, setSelectedVideoFormat] = useState('webm');
  const [jpegQuality, setJpegQuality] = useState(92);

  const getExportSize = useCallback(() => {
    const ratioMap = { '1:1': [2048, 2048], '4:3': [2048, 1536], '3:4': [1536, 2048], '16:9': [2560, 1440], '9:16': [1440, 2560], '5:4': [2048, 1638], '4:5': [1638, 2048], 'A3': [2480, 3508], 'Free': [freeWidth, freeHeight] };
    return ratioMap[aspectRatio] || [2048, 2048];
  }, [aspectRatio, freeWidth, freeHeight]);

  const [exportW, exportH] = getExportSize();
  const previewPaddingBottom = `${((exportH / exportW) * 100).toFixed(4)}%`;

  // For export preview: gentle drift using translate
  const applyFrame = useCallback((p) => {
    // Subtle slow drift: sine wave on both axes
    const driftAmt = (animationSpeed - 1) * 4 + 4; // 4–20px range
    const dx = Math.sin(p * Math.PI * 2) * driftAmt;
    const dy = Math.cos(p * Math.PI * 2 * 0.7) * driftAmt * 0.6;
    const scaleVal = 1 + Math.sin(p * Math.PI * 2 * 0.5) * 0.012 * animationSpeed;
    if (previewRef.current) {
      previewRef.current.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleVal})`;
    }
    const pct = `${(p * 100).toFixed(2)}%`;
    if (fillRef.current) fillRef.current.style.width = pct;
    if (thumbRef.current) thumbRef.current.style.left = pct;
    if (timeRef.current) timeRef.current.textContent = `${(p * effectiveDuration).toFixed(1)}s / ${effectiveDuration.toFixed(1)}s`;
  }, [effectiveDuration, animationSpeed]);

  useEffect(() => {
    if (!isAnimated) { applyFrame(0); return; }
    const loop = (ts) => {
      if (isPlayingRef.current) { if (lastTsRef.current !== null) clockRef.current += (ts - lastTsRef.current) / 1000; lastTsRef.current = ts; applyFrame((clockRef.current % effectiveDuration) / effectiveDuration); } else { lastTsRef.current = null; }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); lastTsRef.current = null; };
  }, [isAnimated, effectiveDuration, applyFrame]);

  const handlePlayPause = () => { const next = !isPlayingRef.current; isPlayingRef.current = next; lastTsRef.current = null; setIsPlaying(next); };
  const handleRestart = () => { clockRef.current = 0; lastTsRef.current = null; isPlayingRef.current = true; setIsPlaying(true); applyFrame(0); };

  const doSeek = useCallback((clientX) => {
    const bar = seekBarRef.current; if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    clockRef.current = ratio * effectiveDuration; lastTsRef.current = null; applyFrame(ratio);
  }, [effectiveDuration, applyFrame]);

  const handleSeekMouseDown = (e) => {
    if (!isAnimated) return; e.preventDefault(); doSeek(e.clientX);
    const onMove = (mv) => doSeek(mv.clientX);
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  };

  const cssLinearToCanvas = (ctx, W, H, ang) => {
    const angleRad = ((ang % 360) * Math.PI) / 180;
    const distance = Math.abs(W * Math.sin(angleRad)) + Math.abs(H * Math.cos(angleRad));
    const halfW = W / 2; const halfH = H / 2;
    const x0 = halfW - (Math.sin(angleRad) * distance) / 2;
    const y0 = halfH + (Math.cos(angleRad) * distance) / 2;
    const x1 = halfW + (Math.sin(angleRad) * distance) / 2;
    const y1 = halfH - (Math.cos(angleRad) * distance) / 2;
    return ctx.createLinearGradient(x0, y0, x1, y1);
  };

  const drawToCanvas = (ctx, W, H, p = 0) => {
    ctx.clearRect(0, 0, W, H);
    const smoothed = buildSmoothedStops(sortedStops);

    const paintGradient = (tCtx, VW, VH, offsetX = 0, offsetY = 0) => {
      if (gradientType === 'Linear') {
        const grad = cssLinearToCanvas(tCtx, VW, VH, angle);
        smoothed.forEach(s => { try { grad.addColorStop(s.position / 100, hexToRgba(s.color, s.opacity)); } catch {} });
        tCtx.fillStyle = grad; tCtx.fillRect(0, 0, VW, VH);
      } else if (gradientType === 'Radial') {
        const cx2 = (centerX / 100) * VW; const cy2 = (centerY / 100) * VH;
        const radius = Math.sqrt(Math.max(cx2, VW - cx2) ** 2 + Math.max(cy2, VH - cy2) ** 2);
        const grad = tCtx.createRadialGradient(cx2, cy2, 0, cx2, cy2, radius);
        smoothed.forEach(s => { try { grad.addColorStop(s.position / 100, hexToRgba(s.color, s.opacity)); } catch {} });
        tCtx.fillStyle = grad; tCtx.fillRect(0, 0, VW, VH);
      } else if (gradientType === 'Conic') {
        const cx2 = (centerX / 100) * VW; const cy2 = (centerY / 100) * VH;
        const startRad = (-angle * Math.PI) / 180;
        const grad = tCtx.createConicGradient(startRad, cx2, cy2);
        smoothed.forEach(s => { try { grad.addColorStop(s.position / 100, hexToRgba(s.color, s.opacity)); } catch {} });
        tCtx.fillStyle = grad; tCtx.fillRect(0, 0, VW, VH);
      } else {
        const baseGrad = cssLinearToCanvas(tCtx, VW, VH, 135);
        smoothed.forEach(s => { try { baseGrad.addColorStop(s.position / 100, hexToRgba(s.color, s.opacity)); } catch {} });
        tCtx.fillStyle = baseGrad; tCtx.fillRect(0, 0, VW, VH);
        [{ cx: 0.2, cy: 0.3, r: 0.35, i: 0 }, { cx: 0.8, cy: 0.2, r: 0.35, i: 1 }, { cx: 0.5, cy: 0.8, r: 0.40, i: 2 }]
          .reverse().forEach(({ cx, cy, r, i }) => {
            const s = sortedStops[i]; if (!s) return;
            const g = tCtx.createRadialGradient(VW * cx, VH * cy, 0, VW * cx, VH * cy, Math.max(VW, VH) * r);
            g.addColorStop(0, hexToRgba(s.color, s.opacity)); g.addColorStop(1, 'rgba(0,0,0,0)');
            tCtx.fillStyle = g; tCtx.fillRect(0, 0, VW, VH);
          });
      }
    };

    if (p > 0) {
      // Subtle drift: render slightly oversized canvas and crop with gentle offset
      const pad = Math.round(Math.max(W, H) * 0.06 * animationSpeed);
      const VW = W + pad * 2;
      const VH = H + pad * 2;
      const driftX = Math.sin(p * Math.PI * 2) * pad;
      const driftY = Math.cos(p * Math.PI * 2 * 0.7) * pad * 0.6;
      const srcX = pad + driftX;
      const srcY = pad + driftY;
      const vCanvas = document.createElement('canvas');
      vCanvas.width = VW; vCanvas.height = VH;
      paintGradient(vCanvas.getContext('2d'), VW, VH);
      ctx.drawImage(vCanvas, srcX, srcY, W, H, 0, 0, W, H);
    } else {
      paintGradient(ctx, W, H);
    }

    if (blur > 0) {
      const blurPx = blur * 0.08;
      const tmp = document.createElement('canvas');
      tmp.width = W; tmp.height = H;
      const tCtx = tmp.getContext('2d');
      tCtx.filter = `blur(${blurPx}px)`;
      tCtx.drawImage(ctx.canvas, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.filter = 'none';
      ctx.drawImage(tmp, 0, 0);
    }

    if (noise > 0) {
      const imageData = ctx.getImageData(0, 0, W, H);
      const data = imageData.data;
      const strength = (noise / 100) * 0.7 * 255;
      for (let i = 0; i < data.length; i += 4) {
        const rand = (Math.random() - 0.5) * strength;
        data[i]     = Math.max(0, Math.min(255, data[i]     + rand));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + rand));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + rand));
      }
      ctx.putImageData(imageData, 0, 0);
    }
  };

  const buildSvgString = useCallback((W, H) => {
    const smoothed = buildSmoothedStops(sortedStops);
    const gradId = 'grad1';
    let gradDef = '';
    let fillRef2 = `url(#${gradId})`;

    if (gradientType === 'Linear') {
      const angleRad = ((angle % 360) * Math.PI) / 180;
      const x1pct = (50 - Math.sin(angleRad) * 50).toFixed(2);
      const y1pct = (50 + Math.cos(angleRad) * 50).toFixed(2);
      const x2pct = (50 + Math.sin(angleRad) * 50).toFixed(2);
      const y2pct = (50 - Math.cos(angleRad) * 50).toFixed(2);
      gradDef = `<linearGradient id="${gradId}" x1="${x1pct}%" y1="${y1pct}%" x2="${x2pct}%" y2="${y2pct}%">${smoothed.map(s => `<stop offset="${s.position.toFixed(1)}%" stop-color="${s.color}" stop-opacity="${(s.opacity / 100).toFixed(2)}"/>`).join('')}</linearGradient>`;
    } else if (gradientType === 'Radial') {
      gradDef = `<radialGradient id="${gradId}" cx="${centerX}%" cy="${centerY}%" r="70%" gradientUnits="userSpaceOnUse">${smoothed.map(s => `<stop offset="${s.position.toFixed(1)}%" stop-color="${s.color}" stop-opacity="${(s.opacity / 100).toFixed(2)}"/>`).join('')}</radialGradient>`;
    } else {
      gradDef = `<linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">${smoothed.map(s => `<stop offset="${s.position.toFixed(1)}%" stop-color="${s.color}" stop-opacity="${(s.opacity / 100).toFixed(2)}"/>`).join('')}</linearGradient>`;
    }

    let filterDef = '';
    let filterAttr = '';
    if (blur > 0) {
      filterDef = `<filter id="blurF"><feGaussianBlur stdDeviation="${(blur * 0.08).toFixed(2)}"/></filter>`;
      filterAttr = ` filter="url(#blurF)"`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${gradDef}${filterDef}</defs><rect width="${W}" height="${H}" fill="${fillRef2}"${filterAttr}/></svg>`;
  }, [sortedStops, gradientType, angle, centerX, centerY, blur]);

  const doExportImage = useCallback(() => {
    const fmt = IMAGE_FORMATS.find(f => f.id === selectedImageFormat);
    const [W, H] = getExportSize();

    if (fmt.id === 'svg') {
      const svgStr = buildSvgString(W, H);
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `gradient-studio.svg`; a.click();
      URL.revokeObjectURL(url);
      onClose();
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    drawToCanvas(canvas.getContext('2d'), W, H);

    const quality = fmt.id === 'jpeg' ? jpegQuality / 100 : fmt.quality;
    const dataUrl = canvas.toDataURL(fmt.mime, quality);
    const a = document.createElement('a');
    a.download = `gradient-studio.${fmt.ext}`;
    a.href = dataUrl;
    a.click();
    onClose();
  }, [selectedImageFormat, getExportSize, drawToCanvas, buildSvgString, jpegQuality, onClose]);

  const doExportVideo = useCallback(() => {
    const fmt = VIDEO_FORMATS.find(f => f.id === selectedVideoFormat);
    const [W, H] = getExportSize();
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(30);

    let mimeType = 'video/mp4';
    if (!MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/webm; codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
    }

    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];
    setIsExporting(true);
    setExportProgress(0);
    setExportStatusText(fmt.id === 'mp4' && mimeType.includes('webm') ? 'מכין... (נשמר כ-WebM תואם)' : 'מכין...');

    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const actualMime = mimeType.includes('mp4') ? 'video/mp4' : 'video/webm';
      const actualExt = mimeType.includes('mp4') ? 'mp4' : (fmt.id === 'mp4' ? 'mp4' : 'webm');
      const blob = new Blob(chunks, { type: actualMime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `gradient-animation.${actualExt}`; a.click();
      setIsExporting(false);
      onClose();
    };

    let startTs = null;
    mediaRecorder.start();
    const render = (ts) => {
      if (!startTs) startTs = ts;
      const el = (ts - startTs) / 1000;
      if (el >= effectiveDuration) { mediaRecorder.stop(); return; }
      const p = (el % effectiveDuration) / effectiveDuration;
      setExportProgress(Math.round((el / effectiveDuration) * 100));
      drawToCanvas(ctx, W, H, p);
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }, [selectedVideoFormat, getExportSize, effectiveDuration, drawToCanvas, onClose]);

  const activeImageFmt = IMAGE_FORMATS.find(f => f.id === selectedImageFormat);
  const activeVideoFmt = VIDEO_FORMATS.find(f => f.id === selectedVideoFormat);

  return (
    <div className="export-modal-overlay" onClick={onClose}>
      <div className="export-modal" onClick={e => e.stopPropagation()} dir="rtl">
        <div className="export-modal-header">
          <h3>{isAnimated ? 'תצוגה מקדימה של הסרטון' : 'תצוגה מקדימה של התמונה'}</h3>
          <button className="export-modal-close" onClick={onClose}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>

        <div className="export-canvas-wrap">
          <div style={{ position: 'relative', width: '100%', paddingBottom: previewPaddingBottom, background: '#000', overflow: 'hidden', maxHeight: '40vh' }}>
            <div style={{ position: 'absolute', inset: 0, filter: blur > 0 ? `blur(${blur * 0.08}px)` : undefined, overflow: 'hidden' }}>
              <div
                ref={previewRef}
                style={{
                  position: 'absolute',
                  inset: '-8%',
                  backgroundImage: gradientCss,
                  backgroundSize: '100% 100%',
                  willChange: 'transform',
                  transition: 'none',
                }}
              />
              {noise > 0 && (
                <div style={{ position: 'absolute', inset: 0, backgroundImage: NOISE_SVG, backgroundRepeat: 'repeat', backgroundSize: '150px 150px', opacity: (noise / 100) * 0.7, mixBlendMode: 'overlay', pointerEvents: 'none' }} />
              )}
            </div>
          </div>
          {isAnimated && (
            <div className="playback-controls">
              <div className="playback-bar-wrap" ref={seekBarRef} onMouseDown={handleSeekMouseDown}>
                <div className="playback-bar-bg"><div ref={fillRef} className="playback-bar-fill" style={{ width: '0%' }} /><div ref={thumbRef} className="playback-bar-thumb" style={{ left: '0%' }} /></div>
              </div>
              <div className="playback-row">
                <button className="pb-btn" onClick={handleRestart}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.5" /></svg></button>
                <button className="pb-btn pb-btn-main" onClick={handlePlayPause}>
                  {isPlaying ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>}
                </button>
                <span ref={timeRef} className="pb-time">0.0s / {effectiveDuration.toFixed(1)}s</span>
              </div>
            </div>
          )}
        </div>

        <div className="export-format-section">
          <div className="export-format-label">{isAnimated ? 'פורמט סרטון' : 'פורמט תמונה'}</div>
          <div className="export-format-grid">
            {(isAnimated ? VIDEO_FORMATS : IMAGE_FORMATS).map(fmt => (
              <button
                key={fmt.id}
                type="button"
                className={`export-format-card ${(isAnimated ? selectedVideoFormat : selectedImageFormat) === fmt.id ? 'active' : ''}`}
                onClick={() => isAnimated ? setSelectedVideoFormat(fmt.id) : setSelectedImageFormat(fmt.id)}
                disabled={isExporting}
              >
                <span className="export-format-name">{fmt.label}</span>
                <span className="export-format-desc">{fmt.description}</span>
              </button>
            ))}
          </div>
          {!isAnimated && selectedImageFormat === 'jpeg' && (
            <div className="export-quality-row">
              <SliderRow label="איכות" value={`${jpegQuality}%`} defaultValue={jpegQuality} minValue={10} maxValue={100} onChange={setJpegQuality} />
            </div>
          )}
          {!isAnimated && selectedImageFormat === 'svg' && (
            <div className="export-svg-note">ⓘ SVG תומך ב-Linear וב-Radial. Conic ו-Freeform יומרו לגרדיאנט קווי.</div>
          )}
          {isAnimated && selectedVideoFormat === 'mp4' && (
            <div className="export-svg-note">ⓘ MP4 נתמך בדפדפנים מסוימים. אם הדפדפן לא תומך, הקובץ יישמר כ-WebM עם סיומת .mp4</div>
          )}
        </div>

        <div className="export-modal-info">
          {isAnimated
            ? `${activeVideoFmt?.label} · ${exportW}×${exportH}px · ${effectiveDuration.toFixed(1)} שניות`
            : `${activeImageFmt?.label} · ${exportW}×${exportH}px`}
        </div>

        {isExporting && (
          <div className="recording-progress">
            <div className="recording-bar-bg"><div className="recording-bar-fill" style={{ width: `${exportProgress}%` }} /></div>
            <span>{exportStatusText || 'מכין...'} {exportProgress}%</span>
          </div>
        )}

        <div className="export-modal-actions">
          <button className="export-modal-cancel" onClick={onClose} disabled={isExporting}>ביטול</button>
          <button
            className="export-modal-confirm"
            onClick={isAnimated ? doExportVideo : doExportImage}
            disabled={isExporting}
          >
            {isExporting
              ? `${exportStatusText || 'מכין...'} ${exportProgress}%`
              : isAnimated
                ? `הורד ${activeVideoFmt?.label}`
                : `הורד ${activeImageFmt?.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}


function GradientColorEditor({ colorStops, activeStopId, activeStop, gradientCss, gradientCssTracker, onSelectStop, onUpdateStop, onAddStop, onRemoveStop, onDuplicateStop }) {
  const paletteColors = ['#000000', '#cccccc', '#f1eeee', '#e97baa', '#ff2d24', '#2d4bff', '#49482c', '#e9932e', '#8c0048'];
  const [editingPositionId, setEditingPositionId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const inputRef = useRef(null);

  const sortedForTrack = useMemo(() => [...colorStops].sort((a, b) => a.position - b.position), [colorStops]);

  function handlePositionClick(stop, e) { e.stopPropagation(); setEditingPositionId(stop.id); setEditingValue(String(stop.position)); }
  function handlePositionBlur(stop) { const parsed = parseInt(editingValue, 10); if (!isNaN(parsed)) { onUpdateStop(stop.id, 'position', Math.max(0, Math.min(100, parsed))); } setEditingPositionId(null); setEditingValue(''); }
  function handlePositionKeyDown(e, stop) { if (e.key === 'Enter') { e.currentTarget.blur(); } if (e.key === 'Escape') { setEditingPositionId(null); setEditingValue(''); } }

  useEffect(() => { if (editingPositionId !== null && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editingPositionId]);

  const handleDragStart = (stopId, e) => {
    e.preventDefault(); const track = e.currentTarget.parentElement; if (!track) return; onSelectStop(stopId);
    const handleMove = (mv) => { const rect = track.getBoundingClientRect(); const clientX = mv.type.startsWith('touch') ? mv.touches[0].clientX : mv.clientX; onUpdateStop(stopId, 'position', Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)))); };
    const handleRelease = () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleRelease); window.removeEventListener('touchmove', handleMove); window.removeEventListener('touchend', handleRelease); };
    window.addEventListener('mousemove', handleMove); window.addEventListener('mouseup', handleRelease); window.addEventListener('touchmove', handleMove, { passive: false }); window.addEventListener('touchend', handleRelease);
  };

  return (
    <div className="color-editor">
      <div className="color-input-row">
        <div className="color-picker-wrapper">
          <input type="color" id="native-color-picker" className="native-color-picker" value={activeStop.color} onChange={(e) => onUpdateStop(activeStop.id, 'color', e.target.value)} />
          <label htmlFor="native-color-picker" className="big-color-preview" style={{ backgroundColor: activeStop.color }} />
        </div>
        <div className="hex-input-wrap">
          <span className="hex-hash">#</span>
          <input className="hex-input" value={activeStop.color.replace('#', '')} maxLength={6} onChange={(e) => { const val = e.target.value; if (/^[0-9A-Fa-f]{0,6}$/.test(val)) onUpdateStop(activeStop.id, 'color', val ? `#${val}` : '#'); }} />
        </div>
      </div>
      <div className="palette-section">
        <span className="section-label">בחירה מהירה:</span>
        <div className="palette-grid">
          {paletteColors.map((color) => (<button key={color} type="button" className={`palette-color ${activeStop.color.toLowerCase() === color ? 'selected' : ''}`} style={{ backgroundColor: color }} onClick={() => onUpdateStop(activeStop.id, 'color', color)} />))}
        </div>
      </div>
      <div className="gradient-track-wrap">
        <div className="gradient-track" style={{ background: gradientCssTracker }}>
          {sortedForTrack.map((stop) => (
            <button key={stop.id} type="button" className={`stop-handle ${stop.id === activeStopId ? 'active' : ''}`} style={{ left: `${stop.position}%`, backgroundColor: stop.color }} onMouseDown={(e) => handleDragStart(stop.id, e)} onTouchStart={(e) => handleDragStart(stop.id, e)} />
          ))}
        </div>
      </div>
      <div className="stop-actions">
        <button type="button" onClick={onAddStop}>+ הוסף צבע</button>
        <button type="button" onClick={() => onDuplicateStop(activeStop.id)}>שכפל</button>
        <button type="button" onClick={() => onRemoveStop(activeStop.id)} disabled={colorStops.length <= 2}>מחק</button>
      </div>
      <SliderRow label="אטימות (Opacity)" value={`${activeStop.opacity}%`} defaultValue={activeStop.opacity} minValue={0} maxValue={100} onChange={(v) => onUpdateStop(activeStop.id, 'opacity', v)} />
      <div className="stops-list-header"><span className="section-label">צבעים</span></div>
      <div className="stops-list">
        {sortedForTrack.map((stop, index) => (
          <button key={stop.id} type="button" className={`stop-list-item ${stop.id === activeStopId ? 'active' : ''}`} onClick={() => onSelectStop(stop.id)}>
            <span className="stop-list-color" style={{ backgroundColor: stop.color }} />
            <span>צבע {index + 1}</span>
            {editingPositionId === stop.id ? (
              <span className="position-input-wrap" onClick={e => e.stopPropagation()}>
                <input ref={inputRef} className="position-input" type="number" min="0" max="100" value={editingValue} onChange={e => setEditingValue(e.target.value)} onBlur={() => handlePositionBlur(stop)} onKeyDown={e => handlePositionKeyDown(e, stop)} />
                <span className="position-input-pct">%</span>
              </span>
            ) : (
              <strong className="stop-position-badge" onClick={e => handlePositionClick(stop, e)}>{stop.position}%</strong>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}


function SidebarSection({ title, headerRight, children }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <section className="section">
      <button type="button" className="section-trigger-button" onClick={() => setIsOpen(!isOpen)}>
        <div className="section-title-left"><h1>{title}</h1>{headerRight}</div>
        <div className={`arrow ${isOpen ? 'open' : ''}`}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg></div>
      </button>
      <div className={`section-collapse-wrapper ${isOpen ? 'open' : ''}`}><div className="section-body">{children}</div></div>
    </section>
  );
}


function SliderRow({ label, value, defaultValue, minValue, maxValue, step = 1, onChange }) {
  return (
    <div className="slider-row">
      <div className="slider-labels"><span>{label}</span><strong>{value}</strong></div>
      <input className="slider" type="range" min={minValue} max={maxValue} step={step} value={defaultValue} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}


function Preview({ gradientCss, aspectRatio, freeWidth, freeHeight, animationDuration, animationSpeed, isAnimated, blur, noise }) {
  const sizeMap = { '1:1': { w: 360, h: 360 }, '4:3': { w: 440, h: 330 }, '3:4': { w: 310, h: 413 }, '16:9': { w: 480, h: 270 }, '9:16': { w: 240, h: 427 }, '5:4': { w: 420, h: 336 }, '4:5': { w: 320, h: 400 }, 'A3': { w: 270, h: 382 } };
  const size = aspectRatio === 'Free'
    ? { width: `${freeWidth}px`, height: `${freeHeight}px`, maxWidth: 'calc(100vw - 520px)', maxHeight: 'calc(100vh - 48px)' }
    : { width: `${(sizeMap[aspectRatio] || { w: 440, h: 330 }).w}px`, height: `${(sizeMap[aspectRatio] || { w: 440, h: 330 }).h}px` };

  const [layers, setLayers] = useState([{ css: gradientCss, key: 0, top: true }]);
  const layerKeyRef = useRef(1);
  const prevCssRef = useRef(gradientCss);

  useEffect(() => {
    if (gradientCss === prevCssRef.current) return;
    prevCssRef.current = gradientCss;
    const newKey = layerKeyRef.current++;
    setLayers(prev => {
      const base = prev[prev.length - 1];
      return [base, { css: gradientCss, key: newKey, top: true }];
    });
    const timer = setTimeout(() => { setLayers([{ css: gradientCss, key: newKey, top: true }]); }, 350);
    return () => clearTimeout(timer);
  }, [gradientCss]);

  // RAF-driven nudge: background-size is 110% so there's a tiny margin to pan within.
  // background-position oscillates between ~45%–55% on each axis — all colours stay
  // fully visible the whole time, they just breathe gently in place.
  const innerLayerRef = useRef(null);
  const rafRef = useRef(null);
  const clockRef = useRef(0);
  const lastTsRef = useRef(null);

  useEffect(() => {
    if (!isAnimated) {
      if (innerLayerRef.current) innerLayerRef.current.style.backgroundPosition = '50% 50%';
      return;
    }
    const speed = animationSpeed;
    const duration = animationDuration;

    const tick = (ts) => {
      if (lastTsRef.current !== null) clockRef.current += (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      const t = (clockRef.current % duration) / duration; // 0→1 loop
      // Two independent slow sine waves for x and y — always stay near 50%
      const amp = 25; // pan ±25% around center — all colours stay in frame
      const x = 50 + Math.sin(t * Math.PI * 2) * amp;
      const y = 50 + Math.cos(t * Math.PI * 2 * 0.7) * amp * 0.6;
      if (innerLayerRef.current) innerLayerRef.current.style.backgroundPosition = `${x.toFixed(2)}% ${y.toFixed(2)}%`;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [isAnimated, animationDuration, animationSpeed]);

  // background-size is 150% so the gradient is larger than the card.
  // Panning 0%→100% on position moves exactly one "extra half" — all colours stay visible.
  const bgSize = isAnimated ? '150% 150%' : '100% 100%';

  return (
    <main className="preview-area">
      <div className="preview-card" style={{ filter: blur > 0 ? `blur(${blur * 0.08}px)` : undefined, position: 'relative', overflow: 'hidden', ...size }}>
        {layers.map((layer, i) => (
          <div
            key={layer.key}
            style={{
              position: 'absolute', inset: 0,
              overflow: 'hidden',
              opacity: i === layers.length - 1 ? 1 : 0,
              transition: i === layers.length - 1 && layers.length > 1 ? 'opacity 0.3s ease' : 'none',
              borderRadius: 'inherit',
            }}
          >
            <div
              ref={i === layers.length - 1 ? innerLayerRef : null}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: layer.css,
                backgroundSize: bgSize,
                backgroundPosition: '50% 50%',
              }}
            />
          </div>
        ))}
        {noise > 0 && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '150px 150px', opacity: (noise / 100) * 0.7, mixBlendMode: 'overlay', pointerEvents: 'none', borderRadius: 'inherit', zIndex: 10 }} />}
      </div>
    </main>
  );
}

export default App;
