export const DrawingCalibrationsV1: Record<string, Record<string, number>> = {
  "48x36": {
    // Same as 36x48
    "150": 0.2083, // 1:150 scale => 1 px = 0.2083 m
    "125": 0.1661, // 1:125 scale => 1 px = 0.1661 m
    "120": 0.1524, // 1:120 scale => 1 px = 0.1524 m
    "100": 0.1526, // 1:100 scale => 1 px = 0.1526 m (This is confirmed)
    "75": 0.0933, // 1:75 scale => 1 px = 0.0933 m
    "50": 0.0622, // 1:50 scale => 1 px = 0.0622 m
  },
  "36x24": {
    // Same as 24x36
    "150": 0.2083, // 1:150 scale => 1 px = 0.2083 m
    "125": 0.125, // 1:125 scale => 1 px = 0.125 m
    "120": 0.1524, // 1:120 scale => 1 px = 0.1524 m
    "100": 0.1016, // 1:100 scale => 1 px = 0.1016 m
    "75": 0.0762, // 1:75 scale => 1 px = 0.0762 m
    "50": 0.0622, // 1:50 scale => 1 px = 0.0622 m
  },
};

export const DrawingCalibrations = {
  "125": 0.1661, // 1:125 scale => 1 px = 0.1661 m
  "100": 0.1526, // 1:100 scale => 1 px = 0.1526 m (This is confirmed)
  "75": 0.0933, // 1:75 scale => 1 px = 0.0933 m
};

export const DEFAULT_CALLIBRATION_VALUE = "100";

export const getDrawingCallibrations = (
  scale: string,
  viewportDimensions: { width: number; height: number }
) => {
  const calibrations =
    DrawingCalibrationsV1[
      Math.max(viewportDimensions.width, viewportDimensions.height) +
        "x" +
        Math.min(viewportDimensions.width, viewportDimensions.height)
    ];

  return calibrations?.[scale || DEFAULT_CALLIBRATION_VALUE];
};
