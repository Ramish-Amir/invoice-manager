import React from "react";
import { Measurement } from "./measurement-overlay";
import { Tag } from "./tag-selector";
import { Badge } from "../ui/badge";
import { Tag as TagIcon } from "lucide-react";
import {
  DEFAULT_CALLIBRATION_VALUE,
  getDrawingCallibrations,
} from "@/lib/drawingCallibrations";

interface MeasurementSummaryProps {
  measurements: Measurement[];
  scaleFactor?: number | null; // deprecated
  scaleFactorGetter?: (measurement: Measurement) => number;
  tags: Tag[];
  callibrationScale: { [page: number]: string };
  viewportDimensions: { width: number; height: number };
}

export const MeasurementSummary: React.FC<MeasurementSummaryProps> = ({
  measurements,
  callibrationScale,
  viewportDimensions,
}) => {
  if (measurements.length === 0) return null;

  // Group measurements by tag
  const measurementsByTag = measurements.reduce((acc, measurement) => {
    const tagId = measurement.tag?.id || "untagged";
    const factor = getDrawingCallibrations(
      callibrationScale?.[measurement?.page] || DEFAULT_CALLIBRATION_VALUE,
      viewportDimensions
    );
    if (!acc[tagId]) {
      acc[tagId] = {
        tag: measurement.tag,
        measurements: [],
        totalLength: 0,
      };
    }
    acc[tagId].measurements.push(measurement);
    acc[tagId].totalLength += measurement.pixelDistance * factor;
    return acc;
  }, {} as Record<string, { tag?: { id: string; name: string; color: string }; measurements: Measurement[]; totalLength: number }>);

  return (
    <div className="mt-8 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Summary by Tags</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(measurementsByTag).map(([tagId, data]) => (
          <div
            key={tagId}
            className="bg-primary/5 border border-primary/20 rounded-md px-4 py-3 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {data.tag ? (
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    style={{
                      backgroundColor: data.tag.color,
                      color: "white",
                      borderColor: data.tag.color,
                    }}
                  >
                    <TagIcon className="w-3 h-3 mr-1" />
                    {data.tag.name}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Untagged
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {data.measurements.length} measurement
                {data.measurements.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="text-xl font-semibold text-primary">
              {data.totalLength.toFixed(2)} m
            </div>
          </div>
        ))}
      </div>

      {/* Total summary */}
      <div className="mt-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-800">
            Total Length
          </span>
          <span className="text-2xl font-bold text-primary">
            {measurements
              .reduce(
                (sum, m) =>
                  sum +
                  m.pixelDistance *
                    getDrawingCallibrations(
                      callibrationScale?.[m?.page] ||
                        DEFAULT_CALLIBRATION_VALUE,
                      viewportDimensions
                    ),
                0
              )
              .toFixed(2)}{" "}
            m
          </span>
        </div>
      </div>
    </div>
  );
};
