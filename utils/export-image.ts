/**
 * Exports an SVG element or raw SVG XML string to a crisp high-res PNG image download.
 */
export async function exportSvgToPng(
  svgInput: SVGSVGElement | string,
  fileName = "diagram.png",
  scale = 2,
  backgroundColor = "#ffffff",
): Promise<void> {
  let svgString: string;
  let width = 800;
  let height = 600;

  if (typeof svgInput === "string") {
    svgString = svgInput;
    if (typeof window !== "undefined") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      if (svgEl) {
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
      }
    }
  } else {
    const serializer = new XMLSerializer();
    svgString = serializer.serializeToString(svgInput);
    const viewBox = svgInput.viewBox?.baseVal;
    if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
      width = viewBox.width;
      height = viewBox.height;
    } else {
      const bbox = svgInput.getBBox?.();
      if (bbox && bbox.width > 0 && bbox.height > 0) {
        width = bbox.width + (bbox.x > 0 ? bbox.x : 0) + 20;
        height = bbox.height + (bbox.y > 0 ? bbox.y : 0) + 20;
      } else {
        width = parseFloat(svgInput.getAttribute("width") || "800") || 800;
        height = parseFloat(svgInput.getAttribute("height") || "600") || 600;
      }
    }
  }

  // Ensure xmlns is present
  if (!svgString.includes("xmlns=")) {
    svgString = svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }

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
