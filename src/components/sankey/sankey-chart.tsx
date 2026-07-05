"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  sankey,
  sankeyLinkHorizontal,
  type SankeyNode as D3SankeyNode,
  type SankeyLink as D3SankeyLink,
} from "d3-sankey";

import type {
  SankeyData,
  SankeyNode as SankeyNodeDatum,
} from "@/lib/sankey/aggregate";

interface LinkDatum {
  source: string;
  target: string;
  value: number;
}

type LayoutNode = D3SankeyNode<SankeyNodeDatum, LinkDatum>;
type LayoutLink = D3SankeyLink<SankeyNodeDatum, LinkDatum>;

const NODE_WIDTH = 14;
const NODE_PADDING = 28;
const HEIGHT = 420;
const MARGIN = { top: 8, right: 8, bottom: 8, left: 8 };

/** Couleur catégorielle par colonne — index fixe (position absolue), jamais recalculé selon les nœuds affichés. */
function seriesColor(position: number): string {
  return `var(--sankey-series-${(position % 8) + 1})`;
}

export function SankeyChart({ data }: { data: SankeyData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(() => {
    if (data.nodes.length === 0) return null;

    const generator = sankey<SankeyNodeDatum, LinkDatum>()
      .nodeId((d) => d.id)
      .nodeWidth(NODE_WIDTH)
      .nodePadding(NODE_PADDING)
      .extent([
        [MARGIN.left, MARGIN.top],
        [
          Math.max(width - MARGIN.right, 200),
          HEIGHT - MARGIN.bottom,
        ],
      ]);

    // d3-sankey mute ses arguments en place : on clone pour ne jamais toucher
    // les données du cache TanStack Query.
    return generator({
      nodes: data.nodes.map((node) => ({ ...node })),
      links: data.links.map((link) => ({ ...link })),
    });
  }, [data, width]);

  if (data.nodes.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
        Aucune transition pour l&apos;instant — déplace une carte vers une autre
        colonne pour voir apparaître le premier flux.
      </div>
    );
  }

  if (!layout) return null;

  const linkPath = sankeyLinkHorizontal<SankeyNodeDatum, LinkDatum>();

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label="Diagramme de flux des candidatures entre colonnes"
      >
        <g>
          {layout.links.map((link: LayoutLink, index: number) => {
            const source = link.source as LayoutNode;
            return (
              <path
                key={index}
                d={linkPath(link) ?? undefined}
                fill="none"
                stroke={seriesColor(source.position)}
                strokeOpacity={0.35}
                strokeWidth={Math.max(1, link.width ?? 0)}
              >
                <title>{`${source.name} → ${(link.target as LayoutNode).name} : ${link.value}`}</title>
              </path>
            );
          })}
        </g>
        <g>
          {layout.nodes.map((node: LayoutNode) => {
            const x0 = node.x0 ?? 0;
            const x1 = node.x1 ?? 0;
            const y0 = node.y0 ?? 0;
            const y1 = node.y1 ?? 0;
            const isLeftHalf = x0 < width / 2;

            return (
              <g key={node.id}>
                <rect
                  x={x0}
                  y={y0}
                  width={x1 - x0}
                  height={Math.max(1, y1 - y0)}
                  rx={2}
                  fill={seriesColor(node.position)}
                >
                  <title>{`${node.name} : ${node.value}`}</title>
                </rect>
                <text
                  x={isLeftHalf ? x1 + 6 : x0 - 6}
                  y={(y0 + y1) / 2}
                  dy="0.35em"
                  textAnchor={isLeftHalf ? "start" : "end"}
                  className="fill-foreground text-xs font-medium"
                >
                  {node.name} ({node.value})
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
