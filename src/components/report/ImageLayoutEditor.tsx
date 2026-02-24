import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Transformer, Line, Text } from 'react-konva';
import Konva from 'konva';
import {
  ImageLayoutItem, PageLayout, GridType,
  ABNT, mmToPx, pxToMm, generateGridLayout, GRID_CONFIGS,
} from '@/types/imageLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Grid3X3, LayoutGrid, Move, RotateCcw, Trash2, Copy, Undo2, Redo2, Maximize2, ZoomIn, ZoomOut,
} from 'lucide-react';

interface Props {
  photos: string[];
  layout: PageLayout | null;
  onLayoutChange: (layout: PageLayout) => void;
  onClose: () => void;
}

const GRID_OPTIONS: { value: GridType; label: string }[] = [
  { value: '1x1', label: '1 foto' },
  { value: '2x1', label: '2 fotos lado a lado' },
  { value: '1x2', label: '2 fotos empilhadas' },
  { value: '2x2', label: '2×2 (4 fotos)' },
  { value: '3x2', label: '3×2 (6 fotos)' },
  { value: '2x3', label: '2×3 (6 fotos)' },
  { value: '3x3', label: '3×3 (9 fotos)' },
  { value: 'custom', label: 'Livre' },
];

// Snap threshold in mm
const SNAP_THRESHOLD = 3;

export const ImageLayoutEditor: React.FC<Props> = ({ photos, layout, onLayoutChange, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);

  // Scale: pixels per mm
  const [scale, setScale] = useState(2.5);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gridType, setGridType] = useState<GridType>(layout?.gridType || '2x2');
  const [gap, setGap] = useState(layout?.gap || 5);
  const [images, setImages] = useState<ImageLayoutItem[]>(layout?.images || []);
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});

  // Undo/Redo
  const [history, setHistory] = useState<ImageLayoutItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const stageW = mmToPx(ABNT.PAGE_W, scale);
  const stageH = mmToPx(ABNT.PAGE_H, scale);

  // Load images
  useEffect(() => {
    const toLoad = photos.filter(src => !loadedImages[src]);
    toLoad.forEach(src => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => {
        setLoadedImages(prev => ({ ...prev, [src]: img }));
      };
    });
  }, [photos]);

  // Initialize layout
  useEffect(() => {
    if (images.length === 0 && photos.length > 0) {
      applyAutoLayout(gridType);
    }
  }, [photos]);

  const pushHistory = useCallback((newImages: ImageLayoutItem[]) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newImages]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setImages(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setImages(history[historyIndex + 1]);
    }
  };

  const applyAutoLayout = (type: GridType) => {
    const newImages = generateGridLayout(photos, type, gap);
    setImages(newImages);
    pushHistory(newImages);
    setGridType(type);
    setSelectedId(null);
  };

  const updateImage = (id: string, updates: Partial<ImageLayoutItem>) => {
    const newImages = images.map(img => img.id === id ? { ...img, ...updates } : img);
    setImages(newImages);
    pushHistory(newImages);
  };

  const deleteImage = (id: string) => {
    const newImages = images.filter(img => img.id !== id);
    setImages(newImages);
    pushHistory(newImages);
    setSelectedId(null);
  };

  const duplicateImage = (id: string) => {
    const img = images.find(i => i.id === id);
    if (!img) return;
    const newImg: ImageLayoutItem = {
      ...img,
      id: `img_${Date.now()}`,
      x: img.x + 10,
      y: img.y + 10,
      zIndex: images.length,
    };
    const newImages = [...images, newImg];
    setImages(newImages);
    pushHistory(newImages);
  };

  const handleDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    let x = pxToMm(e.target.x(), scale);
    let y = pxToMm(e.target.y(), scale);

    // Snap to margins
    if (Math.abs(x - ABNT.MARGIN_LEFT) < SNAP_THRESHOLD) x = ABNT.MARGIN_LEFT;
    if (Math.abs(y - ABNT.MARGIN_TOP) < SNAP_THRESHOLD) y = ABNT.MARGIN_TOP;
    
    const img = images.find(i => i.id === id);
    if (img) {
      const rightEdge = x + img.width;
      const bottomEdge = y + img.height;
      if (Math.abs(rightEdge - (ABNT.PAGE_W - ABNT.MARGIN_RIGHT)) < SNAP_THRESHOLD) {
        x = ABNT.PAGE_W - ABNT.MARGIN_RIGHT - img.width;
      }
      if (Math.abs(bottomEdge - (ABNT.PAGE_H - ABNT.MARGIN_BOTTOM)) < SNAP_THRESHOLD) {
        y = ABNT.PAGE_H - ABNT.MARGIN_BOTTOM - img.height;
      }
      // Snap to center
      const centerX = ABNT.PAGE_W / 2 - img.width / 2;
      const centerY = ABNT.PAGE_H / 2 - img.height / 2;
      if (Math.abs(x - centerX) < SNAP_THRESHOLD) x = centerX;
      if (Math.abs(y - centerY) < SNAP_THRESHOLD) y = centerY;
    }

    e.target.x(mmToPx(x, scale));
    e.target.y(mmToPx(y, scale));
    updateImage(id, { x, y });
  };

  const handleTransformEnd = (id: string, e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    updateImage(id, {
      x: pxToMm(node.x(), scale),
      y: pxToMm(node.y(), scale),
      width: pxToMm(node.width() * scaleX, scale),
      height: pxToMm(node.height() * scaleY, scale),
      rotation: node.rotation(),
    });
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
    }
  };

  // Attach transformer
  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    if (selectedId) {
      const node = stageRef.current.findOne(`#${selectedId}`);
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer()?.batchDraw();
      }
    } else {
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, images]);

  const selectedImage = images.find(i => i.id === selectedId);

  const emitLayout = () => {
    onLayoutChange({
      gridType,
      gap,
      autoFit: gridType !== 'custom',
      images,
    });
    onClose();
  };

  // Zoom controls
  const zoomIn = () => setScale(s => Math.min(s + 0.5, 5));
  const zoomOut = () => setScale(s => Math.max(s - 0.5, 1));

  // Margin guide lines
  const marginLines = [
    // Top margin
    [0, mmToPx(ABNT.MARGIN_TOP, scale), stageW, mmToPx(ABNT.MARGIN_TOP, scale)],
    // Bottom margin
    [0, mmToPx(ABNT.PAGE_H - ABNT.MARGIN_BOTTOM, scale), stageW, mmToPx(ABNT.PAGE_H - ABNT.MARGIN_BOTTOM, scale)],
    // Left margin
    [mmToPx(ABNT.MARGIN_LEFT, scale), 0, mmToPx(ABNT.MARGIN_LEFT, scale), stageH],
    // Right margin
    [mmToPx(ABNT.PAGE_W - ABNT.MARGIN_RIGHT, scale), 0, mmToPx(ABNT.PAGE_W - ABNT.MARGIN_RIGHT, scale), stageH],
  ];

  // Ruler ticks every 10mm
  const rulerTicksH: number[] = [];
  const rulerTicksV: number[] = [];
  for (let i = 0; i <= ABNT.PAGE_W; i += 10) rulerTicksH.push(i);
  for (let i = 0; i <= ABNT.PAGE_H; i += 10) rulerTicksV.push(i);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-lg">Editor de Layout de Imagens</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex <= 0}>
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1}>
            <Redo2 className="w-4 h-4" />
          </Button>
          <div className="h-6 w-px bg-border mx-1" />
          <Button variant="outline" size="sm" onClick={zoomOut}><ZoomOut className="w-4 h-4" /></Button>
          <span className="text-xs font-mono min-w-[3rem] text-center">{Math.round(scale / 2.5 * 100)}%</span>
          <Button variant="outline" size="sm" onClick={zoomIn}><ZoomIn className="w-4 h-4" /></Button>
          <div className="h-6 w-px bg-border mx-1" />
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={emitLayout}>Aplicar Layout</Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Grid selector + properties */}
        <div className="w-72 border-r bg-card p-4 overflow-y-auto shrink-0 space-y-6">
          {/* Grid selector */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layout de Grade</Label>
            <Select value={gridType} onValueChange={(v: GridType) => applyAutoLayout(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GRID_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <Label className="text-xs">Espaçamento (mm)</Label>
              <Slider
                value={[gap]}
                onValueChange={([v]) => setGap(v)}
                min={0} max={20} step={1}
              />
              <span className="text-xs text-muted-foreground">{gap}mm</span>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => applyAutoLayout(gridType)}>
              <Grid3X3 className="w-4 h-4 mr-2" /> Reaplicar Layout Auto
            </Button>
          </div>

          {/* Selected image properties */}
          {selectedImage && (
            <div className="space-y-3 border-t pt-4">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Propriedades</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">X (mm)</Label>
                  <Input
                    type="number" step={1} value={Math.round(selectedImage.x)}
                    onChange={e => updateImage(selectedImage.id, { x: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Y (mm)</Label>
                  <Input
                    type="number" step={1} value={Math.round(selectedImage.y)}
                    onChange={e => updateImage(selectedImage.id, { y: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Largura (mm)</Label>
                  <Input
                    type="number" step={1} value={Math.round(selectedImage.width)}
                    onChange={e => updateImage(selectedImage.id, { width: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Altura (mm)</Label>
                  <Input
                    type="number" step={1} value={Math.round(selectedImage.height)}
                    onChange={e => updateImage(selectedImage.id, { height: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rotação (°)</Label>
                <Slider
                  value={[selectedImage.rotation]}
                  onValueChange={([v]) => updateImage(selectedImage.id, { rotation: v })}
                  min={-180} max={180} step={1}
                />
                <span className="text-xs text-muted-foreground">{selectedImage.rotation}°</span>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Legenda</Label>
                <Input
                  value={selectedImage.caption}
                  onChange={e => updateImage(selectedImage.id, { caption: e.target.value })}
                  placeholder="Legenda da imagem"
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => duplicateImage(selectedImage.id)}>
                  <Copy className="w-3 h-3 mr-1" /> Duplicar
                </Button>
                <Button variant="destructive" size="sm" className="flex-1" onClick={() => deleteImage(selectedImage.id)}>
                  <Trash2 className="w-3 h-3 mr-1" /> Remover
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => updateImage(selectedImage.id, { rotation: 0 })}>
                <RotateCcw className="w-3 h-3 mr-1" /> Resetar Rotação
              </Button>
            </div>
          )}

          {/* Image list */}
          <div className="space-y-2 border-t pt-4">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Imagens ({images.length}/{photos.length})
            </Label>
            {images.map((img, i) => (
              <div
                key={img.id}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs ${selectedId === img.id ? 'bg-primary/10 border border-primary' : 'bg-muted/50 hover:bg-muted'}`}
                onClick={() => setSelectedId(img.id)}
              >
                <img src={img.src} className="w-8 h-8 object-cover rounded" alt="" />
                <span className="truncate flex-1">{img.caption || `Imagem ${i + 1}`}</span>
                <span className="text-muted-foreground">{Math.round(img.width)}×{Math.round(img.height)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas area */}
        <div ref={containerRef} className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-8">
          <div className="shadow-2xl border bg-white" style={{ width: stageW, height: stageH }}>
            <Stage
              ref={stageRef}
              width={stageW}
              height={stageH}
              onClick={handleStageClick}
              onTap={() => setSelectedId(null)}
            >
              <Layer>
                {/* Page background */}
                <Rect x={0} y={0} width={stageW} height={stageH} fill="#ffffff" />

                {/* Margin guides */}
                {marginLines.map((pts, i) => (
                  <Line key={`margin-${i}`} points={pts} stroke="#e0e0e0" strokeWidth={1} dash={[4, 4]} />
                ))}

                {/* Center guides */}
                <Line
                  points={[stageW / 2, 0, stageW / 2, stageH]}
                  stroke="#f0f0f0" strokeWidth={0.5} dash={[2, 4]}
                />
                <Line
                  points={[0, stageH / 2, stageW, stageH / 2]}
                  stroke="#f0f0f0" strokeWidth={0.5} dash={[2, 4]}
                />

                {/* Ruler ticks */}
                {rulerTicksH.map(mm => (
                  <React.Fragment key={`rh-${mm}`}>
                    <Line
                      points={[mmToPx(mm, scale), 0, mmToPx(mm, scale), mm % 50 === 0 ? 12 : 6]}
                      stroke="#999" strokeWidth={0.5}
                    />
                    {mm % 50 === 0 && mm > 0 && (
                      <Text x={mmToPx(mm, scale) - 8} y={1} text={`${mm}`} fontSize={8} fill="#999" />
                    )}
                  </React.Fragment>
                ))}
                {rulerTicksV.map(mm => (
                  <React.Fragment key={`rv-${mm}`}>
                    <Line
                      points={[0, mmToPx(mm, scale), mm % 50 === 0 ? 12 : 6, mmToPx(mm, scale)]}
                      stroke="#999" strokeWidth={0.5}
                    />
                    {mm % 50 === 0 && mm > 0 && (
                      <Text x={1} y={mmToPx(mm, scale) - 4} text={`${mm}`} fontSize={8} fill="#999" />
                    )}
                  </React.Fragment>
                ))}

                {/* Images */}
                {images.map(img => {
                  const htmlImg = loadedImages[img.src];
                  if (!htmlImg) return null;
                  return (
                    <KonvaImage
                      key={img.id}
                      id={img.id}
                      image={htmlImg}
                      x={mmToPx(img.x, scale)}
                      y={mmToPx(img.y, scale)}
                      width={mmToPx(img.width, scale)}
                      height={mmToPx(img.height, scale)}
                      rotation={img.rotation}
                      draggable
                      onClick={() => setSelectedId(img.id)}
                      onTap={() => setSelectedId(img.id)}
                      onDragEnd={(e) => handleDragEnd(img.id, e)}
                      onTransformEnd={(e) => handleTransformEnd(img.id, e)}
                    />
                  );
                })}

                {/* Transformer */}
                <Transformer
                  ref={trRef}
                  rotateEnabled={true}
                  keepRatio={false}
                  enabledAnchors={[
                    'top-left', 'top-right', 'bottom-left', 'bottom-right',
                    'middle-left', 'middle-right', 'top-center', 'bottom-center',
                  ]}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 20 || newBox.height < 20) return oldBox;
                    return newBox;
                  }}
                />
              </Layer>
            </Stage>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 border-t bg-card text-xs text-muted-foreground shrink-0">
        <span>Página A4 (210×297mm) | Margens ABNT: 3cm sup/esq, 2cm inf/dir</span>
        <span>{images.length} imagem(ns) | Grid: {gridType}</span>
      </div>
    </div>
  );
};
