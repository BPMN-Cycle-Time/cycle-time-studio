/** Converters from app graphs to the generic LabeledGraph. */
import type { LabeledGraph, ProcessGraph, SocialNetworkData } from "@/types";

/** BP2Graph → LabeledGraph: node label = name, every edge s → t (back edges included). */
export function processGraphToLabeledGraph(pg: ProcessGraph): LabeledGraph {
  return {
    nodes: pg.nodes.map((n) => ({ id: n.id, label: n.name })),
    edges: pg.edges.map((e) => ({ source: e.s, target: e.t })),
  };
}

/** Handover / working-together network → LabeledGraph, weight = interaction count. */
export function socialNetworkToLabeledGraph(sn: SocialNetworkData): LabeledGraph {
  return {
    nodes: sn.nodes.map((n) => ({ id: n.id, label: n.label })),
    edges: sn.edges.map((e) => ({ source: e.source, target: e.target, weight: e.weight })),
  };
}
