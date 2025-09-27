import React, { useState, useEffect, useRef } from "react";
import { Pin, PinOff, Tag, Trash2 } from "lucide-react";

export interface Point {
  x: number;
  y: number;
  page: number;
}

export interface Measurement {
  id: number;
  points: [Point, Point];
  pixelDistance: number;
  page: number;
  tag?: {
    id: string;
    name: string;
    color: string;
  };
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

interface MeasurementOverlayProps {
  pageNumber: number;
  measurements: Measurement[];
  scale: number;
  scaleFactor: number | null;
  hoveredId: number | null;
  pinnedIds: Set<number>;
  isDragging: boolean;
  dragStart: Point | null;
  dragEnd: Point | null;
  dragPage: number | null;
  setHoveredId: (id: number | null) => void;
  onTogglePin: (id: number) => void;
  onTagChange?: (measurementId: number, tag: Tag | null) => void;
  onDeleteMeasurement?: (measurementId: number) => void;
  tags: Tag[];
  pageWidth: number;
}

export const MeasurementOverlay: React.FC<MeasurementOverlayProps> = ({
  pageNumber,
  measurements,
  scale,
  scaleFactor,
  hoveredId,
  pinnedIds,
  isDragging,
  dragStart,
  dragEnd,
  dragPage,
  setHoveredId,
  onTogglePin,
  onTagChange,
  onDeleteMeasurement,
  tags,
  pageWidth,
}) => {
  const [tagSelectorForId, setTagSelectorForId] = useState<number | null>(null);
  const tagSelectorRef = useRef<HTMLDivElement>(null);

  const pageMeasurements = measurements.filter(
    (m) => m.points[0].page === pageNumber && m.points[1].page === pageNumber
  );

  // Close tag selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tagSelectorRef.current &&
        !tagSelectorRef.current.contains(event.target as Node)
      ) {
        setTagSelectorForId(null);
      }
    };

    if (tagSelectorForId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [tagSelectorForId]);

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
      <svg
        className="absolute top-0 left-0 pointer-events-auto"
        width={pageWidth}
        height="100%"
        cursor={"crosshair"}
      >
        {pageMeasurements.map((m) => {
          const [p1, p2] = m.points;
          const x1 = p1.x * scale;
          const y1 = p1.y * scale;
          const x2 = p2.x * scale;
          const y2 = p2.y * scale;
          const isPinned = pinnedIds.has(m.id);

          return (
            <g key={m.id}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={m.tag?.color || "red"}
                // Update the stroke width based on a multiple of scale
                // strokeWidth={Math.min(3, scale * 1.2)}
                strokeWidth={2}
                opacity={isPinned ? 1 : 0.9}
                onMouseEnter={() => setHoveredId(m.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onTogglePin(m.id)}
                style={{ cursor: "pointer", pointerEvents: "visiblePainted" }}
              />
              {/* Start and end dot */}
              <circle
                cx={x1}
                cy={y1}
                r={1}
                fill="white"
                stroke={m.tag?.color || "red"}
                strokeWidth={1}
              />

              <circle
                cx={x2}
                cy={y2}
                r={1}
                fill="white"
                stroke={m.tag?.color || "red"}
                strokeWidth={1}
              />
            </g>
          );
        })}

        {/* Drag preview line */}
        {isDragging && dragStart && dragEnd && dragPage === pageNumber && (
          // <line
          //   x1={dragStart.x * scale}
          //   y1={dragStart.y * scale}
          //   x2={dragEnd.x * scale}
          //   y2={dragEnd.y * scale}
          //   stroke="blue"
          //   strokeWidth={2}
          //   // strokeDasharray="5,5"
          //   opacity={0.7}
          // />
          <g>
            <line
              x1={dragStart.x * scale}
              y1={dragStart.y * scale}
              x2={dragEnd.x * scale}
              y2={dragEnd.y * scale}
              stroke="blue"
              strokeWidth={2}
              // strokeDasharray="5,5"
              opacity={0.7}
            />
            {/* Start and end dot */}
            <circle
              cx={dragStart.x * scale}
              cy={dragStart.y * scale}
              r={1}
              fill="white"
              stroke={"blue"}
              strokeWidth={1}
            />

            <circle
              cx={dragEnd.x * scale}
              cy={dragEnd.y * scale}
              r={1}
              fill="white"
              stroke={"blue"}
              strokeWidth={1}
            />
          </g>
        )}
      </svg>

      {/* HTML labels (outside of SVG) */}
      {pageMeasurements.map((m) => {
        const shouldShowLabel = hoveredId === m.id || pinnedIds.has(m.id);
        if (!shouldShowLabel) return null;
        const [p1, p2] = m.points;
        const x1 = p1.x * scale;
        const y1 = p1.y * scale;
        const x2 = p2.x * scale;
        const y2 = p2.y * scale;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const label = `${(m.pixelDistance * (scaleFactor || 1)).toFixed(2)} m`;

        const isPinned = pinnedIds.has(m.id);

        const isShowingTagSelector = tagSelectorForId === m.id;

        return (
          <div
            key={`label-${m.id}`}
            className="absolute flex flex-col gap-1"
            style={{
              left: midX,
              top: midY - 30, // position above the line
              transform: "translateX(-50%)", // center horizontally
              pointerEvents: "auto", // so button is clickable
            }}
          >
            {/* Main label */}
            <div className="flex items-center gap-2 w-max bg-primary text-white text-xs px-2 py-1 rounded shadow">
              <span
                className="cursor-pointer hover:bg-white/20 rounded px-1 transition-colors"
                onClick={() =>
                  setTagSelectorForId(isShowingTagSelector ? null : m.id)
                }
                title="Click to change tag"
              >
                {label}
              </span>
              {m.tag && (
                <div
                  className="w-3 h-3 rounded-full border border-white"
                  style={{ backgroundColor: m.tag.color }}
                />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(m.id);
                }}
                className="hover:bg-white/20 rounded p-0.5 transition-colors"
                title={isPinned ? "Unpin measurement" : "Pin measurement"}
              >
                {isPinned ? (
                  <PinOff className="w-3 h-3" />
                ) : (
                  <Pin className="w-3 h-3" />
                )}
              </button>
              {isPinned && onDeleteMeasurement && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteMeasurement(m.id);
                  }}
                  className="hover:bg-red-500/20 rounded p-0.5 transition-colors"
                  title="Delete measurement"
                >
                  <Trash2 className="w-3 h-3 text-red-300 hover:text-red-100" />
                </button>
              )}
            </div>

            {/* Tag selector dropdown */}
            {isShowingTagSelector && onTagChange && (
              <div
                ref={tagSelectorRef}
                className="bg-white border border-gray-200 rounded-md shadow-lg p-2 min-w-[120px]"
              >
                <div className="flex items-center gap-1 text-xs text-gray-600 mb-2 font-medium">
                  <Tag className="w-3 h-3" /> Select Tag:
                </div>
                <div className="space-y-1">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        onTagChange(m.id, tag);
                        setTagSelectorForId(null);
                      }}
                      className="flex items-center gap-2 w-full text-left px-2 py-1 rounded hover:bg-gray-100 text-xs"
                    >
                      <div
                        className="w-3 h-3 rounded-full border border-gray-300"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>{tag.name}</span>
                    </button>
                  ))}
                  {/* <button
                    onClick={() => {
                      onTagChange(m.id, null);
                      setTagSelectorForId(null);
                    }}
                    className="flex items-center gap-2 w-full text-left px-2 py-1 rounded hover:bg-gray-100 text-xs text-gray-500"
                  >
                    <Tag className="w-3 h-3" />
                    <span>Remove tag</span>
                  </button> */}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
