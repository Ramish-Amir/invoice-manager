"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pdfjs, Document, Page } from "react-pdf";
import { Upload, FileText } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { TakeoffControlMenu } from "@/components/takeoff-calculator/control-menu";
import { DrawingCallibrationScale } from "@/components/takeoff-calculator/callibration-scale";
import { MeasurementOverlay } from "@/components/takeoff-calculator/measurement-overlay";
import { MeasurementList } from "@/components/takeoff-calculator/measurement-list";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const options = {
  cMapUrl: "/cmaps/",
  standardFontDataUrl: "/standard_fonts/",
  wasmUrl: "/wasm/",
};

const drawingCalibrations: Record<string, number> = {
  "125": 0.1661, // 1:125 scale => 1 px = 0.1661 m
  "100": 0.125, // 1:100 scale => 1 px = 0.125 m
  "75": 0.0933, // 1:75 scale => 1 px = 0.0933 m
};

const defaultCalibrationValue = "125";

type PDFFile = string | File | null;

interface Point {
  x: number;
  y: number;
  page: number;
}

interface Measurement {
  id: number;
  points: [Point, Point];
  pixelDistance: number;
}

const maxWidth = 800;

export default function PDFViewer() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<PDFFile>(
    "/Level1 Floor Plan - Hydronic.pdf"
  );
  const [numPages, setNumPages] = useState<number>();
  const [scale, setScale] = useState(1.25); // This the zoom level, 1.25 is 125%
  const [containerWidth, setContainerWidth] = useState<number>();
  const [pdfWidth, setPdfWidth] = useState<number>(0);
  const [scaleFactor, setScaleFactor] = useState<number | null>(
    drawingCalibrations[defaultCalibrationValue]
  ); // Scale factor for converting pixels to meters
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [history, setHistory] = useState<Measurement[][]>([]);
  const [redoStack, setRedoStack] = useState<Measurement[][]>([]);

  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragEnd, setDragEnd] = useState<Point | null>(null);
  const [dragPage, setDragPage] = useState<number | null>(null);

  const onResize = useCallback<ResizeObserverCallback>((entries) => {
    const [entry] = entries;
    if (entry) setContainerWidth(entry.contentRect.width);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [onResize]);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setNumPages(undefined);
    setMeasurements([]);
    setScaleFactor(null);
    setHistory([]);
    setRedoStack([]);
  }

  function onDocumentLoadSuccess({ numPages: nextNumPages }: any) {
    setNumPages(nextNumPages);
  }

  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    pageNumber: number
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setDragStart({ x, y, page: pageNumber });
    setDragEnd(null);
    setDragPage(pageNumber);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart || dragPage === null) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setDragEnd({ x, y, page: dragPage });
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false);
      return;
    }

    const p1 = dragStart;
    const p2 = dragEnd;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const pixelDistance = Math.sqrt(dx ** 2 + dy ** 2);

    const newMeasurement: Measurement = {
      id: Date.now(),
      points: [p1, p2],
      pixelDistance,
    };

    const updatedMeasurements = [...measurements, newMeasurement];
    setMeasurements(updatedMeasurements);
    setHistory((prev) => [...prev, measurements]);
    setRedoStack([]);

    // Reset drag state
    setDragStart(null);
    setDragEnd(null);
    setDragPage(null);
    setIsDragging(false);
  };

  const renderOverlay = (pageNumber: number) => {
    const pageMeasurements = measurements.filter(
      (m) => m.points[0].page === pageNumber && m.points[1].page === pageNumber
    );

    return (
      <svg
        className="absolute top-0 left-0 pointer-events-auto"
        width={pdfWidth}
        height="100%"
      >
        {pageMeasurements.map((m) => {
          const x1 = m.points[0].x * scale;
          const y1 = m.points[0].y * scale;
          const x2 = m.points[1].x * scale;
          const y2 = m.points[1].y * scale;
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const label = `${(m.pixelDistance * (scaleFactor || 1)).toFixed(
            2
          )} m`;

          return (
            <g key={m.id}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="red"
                strokeWidth={4}
                strokeLinecap="round"
                opacity={0.5}
                onMouseEnter={() => setHoveredId(m.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: "pointer", pointerEvents: "visiblePainted" }}
              />
              {hoveredId === m.id && (
                <>
                  <rect
                    x={midX - 40}
                    y={midY - 24}
                    // Radius for rounded corners
                    rx={4}
                    ry={4}
                    width={80}
                    height={20}
                    fill="rgb(47, 130, 172)"
                    stroke="rgb(47, 130, 172)"
                    strokeWidth={0.5}
                    opacity={0.8}
                  />
                  <text
                    x={midX}
                    y={midY - 10}
                    fill="white"
                    fontSize={12}
                    textAnchor="middle"
                    fontFamily="sans-serif"
                    pointerEvents="none"
                  >
                    {label}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Preview line during drag */}
        {isDragging && dragStart && dragEnd && dragPage === pageNumber && (
          <line
            x1={dragStart.x * scale}
            y1={dragStart.y * scale}
            x2={dragEnd.x * scale}
            y2={dragEnd.y * scale}
            stroke="blue"
            strokeWidth={2}
            strokeDasharray="5,5"
            opacity={0.7}
          />
        )}
      </svg>
    );
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setRedoStack((r) => [measurements, ...r]);
    setMeasurements(prev);
    setHistory((h) => h.slice(0, h.length - 1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setMeasurements(next);
    setHistory((h) => [...h, measurements]);
    setRedoStack((r) => r.slice(1));
  };

  return (
    <div className="">
      <h2 className="text-gray-500">Take-off Calculator</h2>

      <div className="flex justify-between items-center flex-wrap gap-4 my-4">
        {/* Left: File Info */}
        <div className="flex gap-2 items-center text-muted-foreground">
          <FileText />
          {typeof file === "string"
            ? file.split("/").pop()
            : file?.name ?? "No file selected"}
        </div>

        {/* Right: Upload + Scale Selector */}
        <div className="flex items-center gap-2">
          {/* Upload Button */}
          <label className="flex h-9 items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-md cursor-pointer hover:bg-primary/90 transition-colors">
            <Upload className="w-4 h-4 mr-2" />
            Upload PDF
            <input
              type="file"
              accept="application/pdf"
              onChange={onFileChange}
              className="hidden"
            />
          </label>

          <DrawingCallibrationScale setScaleFactor={setScaleFactor} />
        </div>
      </div>

      {file && (
        <div className="relative max-w-[100%] max-h-[100vh] ">
          <TakeoffControlMenu
            scale={scale}
            setScale={setScale}
            handleRedo={handleRedo}
            handleUndo={handleUndo}
          />

          <div
            className="max-w-[100%] max-h-[100vh] overflow-auto"
            ref={containerRef}
          >
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              options={options}
            >
              {Array.from(new Array(numPages), (_, index) => (
                <div
                  key={`pdf_page_${index + 1}`}
                  className="relative mb-6 border"
                  onMouseDown={(e) => handleMouseDown(e, index + 1)}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                >
                  <Page
                    pageNumber={index + 1}
                    scale={scale}
                    width={
                      containerWidth
                        ? Math.min(containerWidth, maxWidth)
                        : maxWidth
                    }
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    onRenderSuccess={(page) => {
                      setPdfWidth(page.height); // By debugging, we can see the height of the PDF page is the correct measurement for canvas width
                    }}
                  />

                  <MeasurementOverlay
                    pageNumber={index + 1}
                    measurements={measurements}
                    scale={scale}
                    scaleFactor={scaleFactor}
                    hoveredId={hoveredId}
                    isDragging={isDragging}
                    dragStart={dragStart}
                    dragEnd={dragEnd}
                    dragPage={dragPage}
                    setHoveredId={setHoveredId}
                    pdfWidth={pdfWidth}
                  />
                </div>
              ))}
            </Document>
          </div>
        </div>
      )}

      <div className="mt-6">
        {measurements.length > 0 && (
          <MeasurementList
            measurements={measurements}
            scaleFactor={scaleFactor}
          />
        )}
      </div>
    </div>
  );
}
