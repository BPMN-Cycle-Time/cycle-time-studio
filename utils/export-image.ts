/**
 * Utilities for preparing and exporting SVG diagrams to high-resolution PNG images.
 */

/**
 * Prepares an SVG element or SVG string for export by:
 * 1. Removing arrow/edge editing helpers (drag dots, midpoint handles, insert buttons, transparent hit lines).
 * 2. Inlining computed styles and resolving CSS variables from the live DOM without modifying layout/dimensions.
 * 3. Preserving the exact original viewBox, scale, and diagram framing.
 */
export function prepareSvgForExport(svgInput: SVGSVGElement | string): {
  svgString: string;
  width: number;
  height: number;
} {
  if (typeof svgInput === "string") {
    let width = 800;
    let height = 600;
    if (typeof window !== "undefined") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgInput, "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      if (svgEl) {
        // Strip arrow edit helpers and insert buttons if present
        const toRemove = svgEl.querySelectorAll(
          ".ins, .halo, .edge-handle, .midpoint-handle, .midpoint-handle-group, .guideline, .snap-guide, line[stroke='transparent'], path[stroke='transparent']",
        );
        toRemove.forEach((el) => el.remove());

        const viewBox = svgEl
          .getAttribute("viewBox")
          ?.trim()
          .split(/[\s,]+/)
          .map(Number);
        if (viewBox && viewBox.length === 4 && viewBox[2] && viewBox[3]) {
          width = viewBox[2];
          height = viewBox[3];
        } else {
          width = parseFloat(svgEl.getAttribute("width") || "800") || 800;
          height = parseFloat(svgEl.getAttribute("height") || "600") || 600;
        }
        const serializer = new XMLSerializer();
        let serialized = serializer.serializeToString(svgEl);
        if (!serialized.includes("xmlns=")) {
          serialized = serialized.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        return { svgString: serialized, width, height };
      }
    }
    return { svgString: svgInput, width, height };
  }

  // Clone the SVG DOM
  const clone = svgInput.cloneNode(true) as SVGSVGElement;

  // Walk original and clone in parallel to inline computed styles and resolve CSS variables
  const origElements = Array.from(svgInput.querySelectorAll("*"));
  const cloneElements = Array.from(clone.querySelectorAll("*"));

  for (let i = 0; i < origElements.length && i < cloneElements.length; i++) {
    const orig = origElements[i] as Element;
    const cl = cloneElements[i] as Element;

    if (!orig || !cl) continue;

    const computed = window.getComputedStyle(orig);

    // If CSS hides this element (e.g. .halo), mark it for removal
    if (computed.display === "none" || computed.visibility === "hidden") {
      cl.setAttribute("data-export-remove", "true");
      continue;
    }

    // Inline colors & vector styles
    if (computed.fill && computed.fill !== "rgba(0, 0, 0, 0)" && computed.fill !== "transparent") {
      cl.setAttribute("fill", computed.fill);
    } else if (
      orig.getAttribute("fill") === "none" ||
      computed.fill === "rgba(0, 0, 0, 0)" ||
      computed.fill === "transparent"
    ) {
      cl.setAttribute("fill", "none");
    }

    if (
      computed.stroke &&
      computed.stroke !== "none" &&
      computed.stroke !== "rgba(0, 0, 0, 0)" &&
      computed.stroke !== "transparent"
    ) {
      cl.setAttribute("stroke", computed.stroke);
    } else if (
      orig.getAttribute("stroke") === "none" ||
      orig.getAttribute("stroke") === "transparent" ||
      computed.stroke === "rgba(0, 0, 0, 0)" ||
      computed.stroke === "transparent"
    ) {
      cl.setAttribute("stroke", "none");
    }

    if (computed.strokeWidth && computed.strokeWidth !== "0px") {
      cl.setAttribute("stroke-width", computed.strokeWidth);
    }

    if (computed.strokeDasharray && computed.strokeDasharray !== "none") {
      cl.setAttribute("stroke-dasharray", computed.strokeDasharray);
    }

    if (computed.opacity && computed.opacity !== "1") {
      cl.setAttribute("opacity", computed.opacity);
    }

    // Inline typography styles on text elements
    if (cl.tagName.toLowerCase() === "text") {
      if (computed.fontFamily) {
        cl.setAttribute("font-family", computed.fontFamily);
      }
      if (computed.fontSize) {
        cl.setAttribute("font-size", computed.fontSize);
      }
      if (computed.fontWeight) {
        cl.setAttribute("font-weight", computed.fontWeight);
      }
      if (computed.textAnchor) {
        cl.setAttribute("text-anchor", computed.textAnchor);
      }
      if (computed.dominantBaseline) {
        cl.setAttribute("dominant-baseline", computed.dominantBaseline);
      }
    }
  }

  // Remove ONLY arrow/edge editing helpers & insert buttons
  const removeSelectors = [
    ".edge-handle", // drag dots on arrows
    ".midpoint-handle", // midpoint handles on arrows
    ".midpoint-handle-group",
    "line[stroke='transparent']", // invisible wide drag hit lines on arrows
    "path[stroke='transparent']", // invisible wide drag hit arcs
    ".ins", // '+' insert block buttons
    ".guideline", // alignment snapping lines
    ".snap-guide",
    "[data-export-remove='true']", // elements hidden by CSS (e.g. .halo)
  ];

  removeSelectors.forEach((selector) => {
    clone.querySelectorAll(selector).forEach((el) => el.remove());
  });

  // Clean selection and drag modifier classes
  clone.querySelectorAll(".sel, .selected, .dragging, .hit").forEach((el) => {
    el.classList.remove("sel", "selected", "dragging", "hit");
    el.removeAttribute("filter");
  });

  // Clean cursor and interactive pointer-events styles
  clone.querySelectorAll("*").forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style?.removeProperty?.("cursor");
    htmlEl.style?.removeProperty?.("pointer-events");
    htmlEl.style?.removeProperty?.("touch-action");
  });

  // Preserve exact original viewBox and dimensions
  let width = 800;
  let height = 600;

  const viewBox = clone.viewBox?.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    width = viewBox.width;
    height = viewBox.height;
  } else {
    width = parseFloat(clone.getAttribute("width") || "800") || 800;
    height = parseFloat(clone.getAttribute("height") || "600") || 600;
  }

  // Serialize to clean SVG string
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clone);

  if (!svgString.includes("xmlns=")) {
    svgString = svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  return { svgString, width, height };
}

/**
 * Exports an SVG element or raw SVG XML string to a crisp high-res PNG image download.
 */
export async function exportSvgToPng(
  svgInput: SVGSVGElement | string,
  fileName = "diagram.png",
  scale = 2,
  backgroundColor = "#ffffff",
): Promise<void> {
  const { svgString, width, height } = prepareSvgForExport(svgInput);

  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const blobUrl = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(blobUrl);
          reject(new Error("Canvas context not available"));
          return;
        }

        // Fill background
        if (backgroundColor) {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(blobUrl);
          if (!blob) {
            reject(new Error("Failed to create blob from canvas"));
            return;
          }
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
          resolve();
        }, "image/png");
      } catch (e) {
        URL.revokeObjectURL(blobUrl);
        reject(e);
      }
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(blobUrl);
      reject(e);
    };

    img.src = blobUrl;
  });
}
