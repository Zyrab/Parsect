/**
 * flattens an array of svg elements into a single array
 * @param {Array} elements - an array of svg elements
 * @returns  {Array} an array of svg elements
 */

export function flattenShapes(elements) {
  const result = [];
  for (const el of elements) {
    if (el.tagName.toLowerCase() === "g") {
      result.push(...flattenShapes(Array.from(el.children)));
    } else {
      result.push(el);
    }
  }
  return result;
}

/**
 * Extracts the relevant attributes for a given SVG shape.
 *
 * @param {Element} element - The SVG shape element (e.g., circle, rect, path).
 * @returns {Object} - The attributes of the SVG shape as a key-value pair object.
 */
export function getShapeAttributes(element) {
  const attributesMap = {
    circle: ["cx", "cy", "r"],
    ellipse: ["cx", "cy", "rx", "ry"],
    rect: ["x", "y", "width", "height", "rx", "ry"],
    line: ["x1", "y1", "x2", "y2"],
    polyline: ["points"],
    polygon: ["points"],
  };

  const shapeType = element.tagName.toLowerCase();
  const attributes = attributesMap[shapeType] || [];
  if (shapeType === "path") {
    return element.getAttribute("d");
  }

  return attributes.reduce((acc, attr) => {
    const value = element.getAttribute(attr);
    acc[attr] =
      value !== null
        ? attr === "points"
          ? parsePoints(value)
          : isNaN(value)
          ? value
          : parseFloat(value)
        : null;
    return acc;
  }, {});
}

/**
 * Parses a string of points (e.g., for polygons or polylines) into an array of coordinates.
 *
 * @param {string} points - A string of points separated by spaces and commas.
 * @returns {Array} - An array of point pairs in the form of [[x1, y1], [x2, y2], ...].
 */
export function parsePoints(points) {
  return points
    .trim()
    .split(/\s+/)
    .map((p) => p.split(",").map(Number));
}

/**
 * Extracts the style attributes (like fill, stroke, etc.) for a given SVG element.
 *
 * @param {Element} element - The SVG shape element.
 * @returns {Object} - A key-value pair of style attributes (e.g., fill, stroke, etc.).
 */
export function getStyleAttributes(element) {
  const attributes = [
    "fill",
    "stroke",
    "stroke-width",
    "opacity",
    "transform",
    "clip-path",
  ];
  const styles = {};

  // Parse inline style attribute and merge
  const inlineStyle = element.getAttribute("style");
  if (inlineStyle) {
    const styleObject = Object.fromEntries(
      inlineStyle
        .split(";")
        .filter(Boolean)
        .map((s) => s.split(":").map((part) => part.trim()))
    );
    Object.assign(styles, styleObject);
  }

  // Handle normal attributes and gradient references
  attributes.forEach((attr) => {
    const value = element.getAttribute(attr);
    if (!value || value === "none") return;

    if (value.startsWith("url(")) {
      const gradientId = value.match(/#(.*)\)/)?.[1];
      if (gradientId) {
        const gradient = element.ownerDocument.getElementById(gradientId);
        if (gradient) {
          styles[attr] = parseGradient(gradient); // your gradient parser
        }
      }
    } else {
      // Don’t overwrite existing inline styles unless not already set
      if (!styles.hasOwnProperty(attr)) {
        styles[attr] = value;
      }
    }
  });

  return styles;
}

/**
 * Parses an SVG gradient (linear or radial) into a structured format.
 *
 * @param {Element} gradient - The gradient element (e.g., <linearGradient> or <radialGradient>).
 * @returns {Object|null} - A structured representation of the gradient or null if no gradient is provided.
 */
export function parseGradient(gradient) {
  if (!gradient) return null;
  const gradientAttributes = {
    linearGradient: ["x1", "y1", "x2", "y2"],
    radialGradient: ["cx", "cy", "r", "fx", "fy"],
  };
  const attrs = gradientAttributes[gradient.tagName] || [];
  const gradientDetails = attrs.reduce((acc, attr) => {
    acc[attr] = gradient.getAttribute(attr);
    return acc;
  }, {});
  const stops = Array.from(gradient.getElementsByTagName("stop")).map(
    (stop) => ({
      offset: stop.getAttribute("offset") || 0,
      color: stop.getAttribute("stop-color") || "#000000",
    })
  );
  return {
    type: gradient.tagName.replace("Gradient", "").toLowerCase(),
    ...gradientDetails,
    stops,
  };
}
