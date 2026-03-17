import type {
  ComicPage,
  ComicLayout,
  ComicPanel,
  ComicSpeechBubble,
  ComicCaption,
} from "@video-generator/shared";
import { COMIC_PAGE_WIDTH, COMIC_PAGE_HEIGHT } from "@video-generator/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FONT_FAMILY = `"Comic Sans MS", "Comic Neue", "Bangers", cursive`;
const CAPTION_FONT_SIZE = 11;
const BUBBLE_FONT_SIZE = 12;
const CHAR_WIDTH_FACTOR = 0.6; // approximate char width = fontSize * factor
const LINE_HEIGHT_FACTOR = 1.35;
const BUBBLE_PADDING = 12;
const CAPTION_PADDING_X = 10;
const CAPTION_PADDING_Y = 6;
const CAPTION_HEIGHT_BASE = 28;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const charWidth = fontSize * CHAR_WIDTH_FACTOR;
  const maxChars = Math.max(8, Math.floor(maxWidth / charWidth));
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length + word.length + 1 > maxChars && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ---------------------------------------------------------------------------
// SVG Shape Builders
// ---------------------------------------------------------------------------

function buildSpeechBubblePath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tailX: number,
  tailY: number,
  type: ComicSpeechBubble["type"]
): string {
  if (type === "thought") {
    // Cloud-shaped bubble — approximated with bumps
    const steps = 12;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const angle = (2 * Math.PI * i) / steps;
      const bump = 1 + 0.12 * Math.sin(angle * 6);
      const px = cx + rx * bump * Math.cos(angle);
      const py = cy + ry * bump * Math.sin(angle);
      d += i === 0 ? `M ${px} ${py}` : ` Q ${cx + rx * 1.1 * Math.cos(angle - Math.PI / steps)} ${cy + ry * 1.1 * Math.sin(angle - Math.PI / steps)} ${px} ${py}`;
    }
    d += " Z";
    // Thought trail — small circles toward tail
    const dx = tailX - cx;
    const dy = tailY - cy;
    d += ` M ${cx + dx * 0.45 + 4} ${cy + dy * 0.45} a 4 4 0 1 0 -8 0 a 4 4 0 1 0 8 0`;
    d += ` M ${cx + dx * 0.65 + 3} ${cy + dy * 0.65} a 3 3 0 1 0 -6 0 a 3 3 0 1 0 6 0`;
    return d;
  }

  // Base ellipse approximated with cubic Bezier curves
  const k = 0.5522848; // magic number for circle approximation
  const ox = rx * k;
  const oy = ry * k;

  // Find closest point on ellipse to tail
  const tailAngle = Math.atan2(tailY - cy, tailX - cx);
  const tipAngle = tailAngle;
  const halfSpread = 0.25;
  const leftAngle = tipAngle - halfSpread;
  const rightAngle = tipAngle + halfSpread;
  const lx = cx + rx * Math.cos(leftAngle);
  const ly = cy + ry * Math.sin(leftAngle);
  const rx2 = cx + rx * Math.cos(rightAngle);
  const ry2 = cy + ry * Math.sin(rightAngle);

  // Build ellipse with tail gap
  let d = `M ${cx - rx} ${cy}`;
  d += ` C ${cx - rx} ${cy - oy}, ${cx - ox} ${cy - ry}, ${cx} ${cy - ry}`;
  d += ` C ${cx + ox} ${cy - ry}, ${cx + rx} ${cy - oy}, ${cx + rx} ${cy}`;
  d += ` C ${cx + rx} ${cy + oy}, ${cx + ox} ${cy + ry}, ${cx} ${cy + ry}`;
  d += ` C ${cx - ox} ${cy + ry}, ${cx - rx} ${cy + oy}, ${cx - rx} ${cy}`;
  d += ` Z`;

  // Tail triangle as separate shape that overlaps
  d += ` M ${lx} ${ly} L ${tailX} ${tailY} L ${rx2} ${ry2} Z`;

  if (type === "shout") {
    // Add spiky overlay — jagged starburst around the ellipse
    const spikes = 16;
    let spike = `M ${cx + rx * 1.2} ${cy}`;
    for (let i = 1; i <= spikes; i++) {
      const angle = (2 * Math.PI * i) / spikes;
      const r = i % 2 === 0 ? 1.0 : 1.25;
      spike += ` L ${cx + rx * r * Math.cos(angle)} ${cy + ry * r * Math.sin(angle)}`;
    }
    spike += " Z";
    return spike + ` M ${lx} ${ly} L ${tailX} ${tailY} L ${rx2} ${ry2} Z`;
  }

  return d;
}

// ---------------------------------------------------------------------------
// Caption Renderer
// ---------------------------------------------------------------------------

function renderCaption(
  panel: ComicPanel,
  caption: ComicCaption
): string {
  const maxWidth = panel.width - 2 * CAPTION_PADDING_X;
  const lines = wrapText(caption.text, maxWidth, CAPTION_FONT_SIZE);
  const lineH = CAPTION_FONT_SIZE * LINE_HEIGHT_FACTOR;
  const rectH = CAPTION_HEIGHT_BASE + (lines.length - 1) * lineH;

  const rectX = panel.x + 4;
  const rectW = panel.width - 8;
  const rectY = caption.position === "top" ? panel.y + 4 : panel.y + panel.height - rectH - 4;

  let svg = `    <g id="${panel.id}-caption" class="caption">\n`;
  svg += `      <rect x="${rectX}" y="${rectY}" width="${rectW}" height="${rectH}" rx="4" class="caption-bg"/>\n`;

  const textX = rectX + CAPTION_PADDING_X;
  const textY = rectY + CAPTION_PADDING_Y + CAPTION_FONT_SIZE;

  svg += `      <text x="${textX}" y="${textY}" class="caption-text">\n`;
  for (let i = 0; i < lines.length; i++) {
    if (i === 0) {
      svg += `        <tspan x="${textX}" dy="0">${escapeXml(lines[i])}</tspan>\n`;
    } else {
      svg += `        <tspan x="${textX}" dy="${lineH}">${escapeXml(lines[i])}</tspan>\n`;
    }
  }
  svg += `      </text>\n`;
  svg += `    </g>\n`;

  return svg;
}

// ---------------------------------------------------------------------------
// Bubble Renderer
// ---------------------------------------------------------------------------

function renderBubble(
  panel: ComicPanel,
  bubble: ComicSpeechBubble,
  index: number
): string {
  const maxBubbleWidth = Math.min(panel.width * 0.6, 200);
  const lines = wrapText(bubble.text, maxBubbleWidth - 2 * BUBBLE_PADDING, BUBBLE_FONT_SIZE);
  const lineH = BUBBLE_FONT_SIZE * LINE_HEIGHT_FACTOR;
  const textBlockH = lines.length * lineH;
  const maxLineW = Math.max(...lines.map(l => l.length * BUBBLE_FONT_SIZE * CHAR_WIDTH_FACTOR));

  const rx = maxLineW / 2 + BUBBLE_PADDING;
  const ry = textBlockH / 2 + BUBBLE_PADDING;

  // Position bubble center within panel
  const cx = panel.x + bubble.position.x * panel.width;
  const cy = panel.y + bubble.position.y * panel.height;

  // Tail points toward bottom of bubble (approx speaker position)
  const tailX = cx + (bubble.position.x > 0.5 ? -15 : 15);
  const tailY = cy + ry + 18;

  const strokeStyle = bubble.type === "whisper" ? `stroke-dasharray="4 3"` : "";
  const path = buildSpeechBubblePath(cx, cy, rx, ry, tailX, tailY, bubble.type);

  let svg = `    <g id="${panel.id}-bubble-${index}" class="speech-bubble">\n`;
  svg += `      <path d="${path}" class="bubble-bg" ${strokeStyle}/>\n`;

  // Text inside bubble
  const textX = cx;
  const textStartY = cy - textBlockH / 2 + BUBBLE_FONT_SIZE;

  svg += `      <text x="${textX}" y="${textStartY}" text-anchor="middle" class="bubble-text">\n`;
  for (let i = 0; i < lines.length; i++) {
    svg += `        <tspan x="${textX}" dy="${i === 0 ? 0 : lineH}">${escapeXml(lines[i])}</tspan>\n`;
  }
  svg += `      </text>\n`;

  // Character name label
  if (bubble.character) {
    svg += `      <text x="${cx}" y="${cy - ry - 4}" text-anchor="middle" class="bubble-character">${escapeXml(bubble.character)}</text>\n`;
  }

  svg += `    </g>\n`;
  return svg;
}

// ---------------------------------------------------------------------------
// Panel Renderer
// ---------------------------------------------------------------------------

function renderPanel(
  panel: ComicPanel,
  pagePanel: { sceneNumber: number; caption?: ComicCaption; bubbles: ComicSpeechBubble[] }
): string {
  let svg = `  <g id="${panel.id}" class="panel">\n`;

  // Gray placeholder
  svg += `    <rect x="${panel.x}" y="${panel.y}" width="${panel.width}" height="${panel.height}" class="panel-bg"/>\n`;

  // Scene number label (centered)
  const labelX = panel.x + panel.width / 2;
  const labelY = panel.y + panel.height / 2;
  svg += `    <text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="central" class="scene-label">Scène ${pagePanel.sceneNumber}</text>\n`;

  // Panel border (on top of bg)
  svg += `    <rect x="${panel.x}" y="${panel.y}" width="${panel.width}" height="${panel.height}" class="panel-border"/>\n`;

  // Caption
  if (pagePanel.caption?.text) {
    svg += renderCaption(panel, pagePanel.caption);
  }

  svg += `  </g>\n`;
  return svg;
}

// ---------------------------------------------------------------------------
// Page SVG Generator (main export)
// ---------------------------------------------------------------------------

export function generateComicPageSVG(
  page: ComicPage,
  layout: ComicLayout
): string {
  const W = COMIC_PAGE_WIDTH;
  const H = COMIC_PAGE_HEIGHT;

  let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"\n`;
  svg += `     viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n`;
  svg += `  <defs>\n`;
  svg += `    <style>\n`;
  svg += `      .panel-border { stroke: #000000; stroke-width: 3; fill: none; }\n`;
  svg += `      .panel-bg { fill: #E8E8E8; }\n`;
  svg += `      .caption-bg { fill: #FFF9C4; stroke: #000000; stroke-width: 1; rx: 4; opacity: 0.92; }\n`;
  svg += `      .caption-text { font-family: ${FONT_FAMILY}; font-size: ${CAPTION_FONT_SIZE}px; font-style: italic; fill: #1A1A1A; }\n`;
  svg += `      .bubble-bg { fill: #FFFFFF; stroke: #000000; stroke-width: 2; }\n`;
  svg += `      .bubble-text { font-family: ${FONT_FAMILY}; font-size: ${BUBBLE_FONT_SIZE}px; font-weight: bold; fill: #000000; }\n`;
  svg += `      .bubble-character { font-family: sans-serif; font-size: 9px; fill: #666666; }\n`;
  svg += `      .scene-label { font-family: sans-serif; font-size: 16px; fill: #999999; font-weight: bold; }\n`;
  svg += `    </style>\n`;
  svg += `  </defs>\n\n`;

  // White page background
  svg += `  <rect width="${W}" height="${H}" fill="#FFFFFF"/>\n\n`;

  // Render each panel
  const panelMap = new Map(layout.panels.map(p => [p.id, p]));

  for (const pagePanel of page.panels) {
    const layoutPanel = panelMap.get(pagePanel.panelId);
    if (!layoutPanel) continue;
    svg += renderPanel(layoutPanel, pagePanel);
    svg += "\n";
  }

  svg += `</svg>\n`;
  return svg;
}
