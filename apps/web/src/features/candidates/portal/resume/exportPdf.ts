/**
 * Rasterises a resume sheet into an A4 PDF, breaking pages between blocks.
 *
 * The old export laid one tall image across pages at fixed 297 mm offsets, so a page could end
 * through the middle of a line of text. Here every element marked `data-keep` (a job, a
 * qualification, a heading with its first entry) is measured first, and each page ends just
 * above whichever block would straddle the cut. A block taller than a whole page is the one
 * thing still cut, since there is no page it would fit on.
 */

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
/** Top margin on pages after the first, so continued text does not touch the paper edge. */
const CONTINUATION_MARGIN_MM = 12;
/** A break never lands this close to the page's start — that would leave a near-empty page. */
const MIN_PAGE_FILL_PX = 120;

interface Options {
  /** Run continuation pages edge to edge — a sidebar layout would otherwise show a white gap. */
  fullBleed?: boolean;
}

/** Page slices, in CSS px from the sheet's top, that end only between kept blocks. */
export function pageBreaks(
  totalHeight: number,
  blocks: { top: number; bottom: number }[],
  firstPageHeight: number,
  pageHeight: number,
): [number, number][] {
  const pages: [number, number][] = [];
  let start = 0;
  while (start < totalHeight - 1) {
    let end = start + (pages.length ? pageHeight : firstPageHeight);
    if (end >= totalHeight) {
      pages.push([start, totalHeight]);
      break;
    }
    // Pull the cut up above every block it would slice, until nothing straddles it. Blocks
    // nest (a heading's wrapper holds its first entry), so one pass may expose another.
    for (let moved = true; moved;) {
      moved = false;
      for (const b of blocks) {
        if (b.top < end - 1 && b.bottom > end + 1 && b.top > start + MIN_PAGE_FILL_PX) {
          end = b.top;
          moved = true;
        }
      }
    }
    pages.push([start, end]);
    start = end;
  }
  return pages;
}

export async function exportResumePdf(
  node: HTMLElement,
  filename: string,
  { fullBleed = false }: Options = {},
) {
  const html2canvas = (await import('html2canvas-pro')).default;
  const { jsPDF } = await import('jspdf');

  // A template's web font may still be loading; measuring or drawing before it lands would
  // print the fallback face and break pages at the wrong lines.
  await document.fonts?.ready;

  const scale = 2;
  const origin = node.getBoundingClientRect().top;
  const blocks = Array.from(node.querySelectorAll<HTMLElement>('[data-keep]')).map((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top - origin, bottom: r.bottom - origin };
  });

  const pxPerMm = node.offsetWidth / A4_WIDTH_MM;
  const margin = fullBleed ? 0 : CONTINUATION_MARGIN_MM;
  const pageHeight = A4_HEIGHT_MM * pxPerMm;
  let pages = pageBreaks(node.offsetHeight, blocks, pageHeight, (A4_HEIGHT_MM - margin) * pxPerMm);

  // A sidebar's colour stops where the content does, which leaves the last page half panel and
  // half white. Stretching the sheet to fill that page carries the sidebar to the bottom edge.
  // Content above is unchanged, so the breaks already found still hold.
  const previousMinHeight = node.style.minHeight;
  const last = pages.at(-1);
  if (fullBleed && last && pages.length > 1 && last[1] - last[0] < pageHeight) {
    node.style.minHeight = `${last[0] + pageHeight}px`;
    pages = [...pages.slice(0, -1), [last[0], last[0] + pageHeight]];
  }

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(node, { scale, useCORS: true, backgroundColor: '#ffffff' });
  } finally {
    node.style.minHeight = previousMinHeight;
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  pages.forEach(([from, to], i) => {
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = Math.max(1, Math.round((to - from) * scale));
    const ctx = slice.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(
      canvas,
      0,
      Math.round(from * scale),
      canvas.width,
      slice.height,
      0,
      0,
      slice.width,
      slice.height,
    );

    if (i > 0) pdf.addPage();
    // JPEG keeps a two-page resume to a few hundred KB; PNG at this scale runs to megabytes.
    pdf.addImage(
      slice.toDataURL('image/jpeg', 0.92),
      'JPEG',
      0,
      i > 0 ? margin : 0,
      A4_WIDTH_MM,
      (to - from) / pxPerMm,
    );
  });

  pdf.save(filename);
}
