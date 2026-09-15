import mongoose from 'mongoose';
import { generateWithoutContext } from '../ai/groq.service';
import { generateEmbedding, cosineSimilarity } from '../../utils/embeddings';

// ─────────────────────────────────────────────────────────────────────────────
// Pedagogical Knowledge Graph-Guided Retrieval (Graph-RAG)
//
// Academic Novelty:
//   Constructs a dynamic Concept Dependency Graph G=(V,E) from course document
//   chunks using an LLM extraction pass. During retrieval, expands the query
//   with 1-hop prerequisite concept nodes before hybrid RAG runs, ensuring
//   that conceptually prerequisite content is always included in the context
//   window — a capability absent from standard flat-chunk RAG systems.
//
//   Graph-Augmented RRF Score:
//     S_GraphRAG(d) = β · S_RRF(d) + (1-β) · PPR(v_q, N(v_q))
//   Where:
//     β = 0.7 (weight of direct retrieval vs. graph-expansion)
//     PPR(v_q, N(v_q)) = Personalized PageRank contribution from concept graph
//
//   Concept Similarity (Edge Formation):
//     Edge e(v_i, v_j) exists iff cos(E(v_i), E(v_j)) > θ_edge = 0.55
//     AND an LLM confirms a pedagogical dependency relationship.
//
// Reference: Edge, D. et al. (2024). From Local to Global: A Graph RAG
//   Approach to Query-Focused Summarization. arXiv:2404.16130.
//   Pan, L. et al. (2024). Unifying Large Language Models and Knowledge Graphs.
//   IEEE Transactions on Knowledge and Data Engineering, 36(7).
// ─────────────────────────────────────────────────────────────────────────────

/** Weight balancing direct RRF score vs. graph-expansion score (β) */
const BETA = 0.7;

/** Minimum cosine similarity between concept embeddings to form a dependency edge */
const EDGE_SIMILARITY_THRESHOLD = 0.55;

/** Personalized PageRank damping factor */
const PPR_DAMPING = 0.85;

/** Maximum 1-hop neighbors to expand per query concept */
const MAX_GRAPH_EXPANSION = 3;

export interface ConceptNode {
  id: string;                    // Unique concept identifier (slugified name)
  label: string;                 // Human-readable concept name
  embedding: number[];           // Vector representation of the concept
  documentId?: string;           // Source document this concept was extracted from
  chunkText?: string;            // Representative chunk text for this concept
  pageNumber?: number;
}

export interface ConceptEdge {
  fromId: string;
  toId: string;
  relationshipType: 'prerequisite' | 'related' | 'extends' | 'contrasts';
  weight: number;                // Cosine similarity between concept embeddings
}

export interface ConceptGraph {
  courseId: string;
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  builtAt: Date;
}

export interface GraphExpansionResult {
  originalQuery: string;
  expandedQuery: string;                // Query enriched with prerequisite concepts
  prerequisiteConcepts: string[];       // Names of prerequisite concepts added
  graphScoreContribution: number;       // PPR-based score contribution (1-β factor)
}

// ── In-memory graph cache (per course) ─────────────────────────────────────
const graphCache = new Map<string, ConceptGraph>();

/**
 * Extracts key academic concepts and their dependencies from a batch of
 * course document chunks using an LLM extraction pass.
 *
 * @param chunks     - Array of text chunks from course documents
 * @param courseId   - Course identifier for caching
 * @param courseName - Human-readable course name
 * @returns Constructed ConceptGraph
 */
export async function buildConceptGraph(
  chunks: Array<{ id: string; text: string; documentId?: string; pageNumber?: number }>,
  courseId: string,
  courseName: string
): Promise<ConceptGraph> {
  // Use a representative sample to avoid excessive token usage
  const sampleChunks = chunks.slice(0, 20);
  const combinedText = sampleChunks.map((c) => c.text.substring(0, 300)).join('\n---\n');

  const extractionPrompt = `You are an academic curriculum analyst for the "${courseName}" course.
Extract the 10–15 most important core concepts from the following course material.
For each concept, identify which concepts are PREREQUISITES (must be understood first).

Respond with ONLY valid JSON:
{
  "concepts": [
    {
      "label": "Concept Name",
      "prerequisites": ["Prerequisite Concept 1", "Prerequisite Concept 2"],
      "relatedTo": ["Related Concept A"]
    }
  ]
}`;

  let extractedConcepts: Array<{
    label: string;
    prerequisites: string[];
    relatedTo: string[];
  }> = [];

  try {
    const response = await generateWithoutContext(
      [{ role: 'user', content: `Course Material:\n${combinedText}` }],
      extractionPrompt,
      0.1,
      true
    );
    const parsed = JSON.parse(response.content);
    extractedConcepts = parsed.concepts || [];
  } catch (err) {
    console.warn('[KnowledgeGraph] Concept extraction failed:', err);
    return { courseId, nodes: [], edges: [], builtAt: new Date() };
  }

  // Build nodes with embeddings
  const nodes: ConceptNode[] = [];
  const nodeMap = new Map<string, ConceptNode>();

  await Promise.all(
    extractedConcepts.map(async (c) => {
      const id = c.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const embedding = await generateEmbedding(c.label);
      const node: ConceptNode = { id, label: c.label, embedding };
      nodes.push(node);
      nodeMap.set(c.label.toLowerCase(), node);
    })
  );

  // Build edges based on extracted prerequisites + similarity validation
  const edges: ConceptEdge[] = [];

  for (const concept of extractedConcepts) {
    const fromNode = nodeMap.get(concept.label.toLowerCase());
    if (!fromNode) continue;

    // Add prerequisite edges
    for (const prereq of concept.prerequisites || []) {
      const toNode = nodeMap.get(prereq.toLowerCase());
      if (!toNode || toNode.id === fromNode.id) continue;
      const weight = cosineSimilarity(fromNode.embedding, toNode.embedding);
      if (weight >= EDGE_SIMILARITY_THRESHOLD) {
        edges.push({ fromId: fromNode.id, toId: toNode.id, relationshipType: 'prerequisite', weight });
      }
    }

    // Add related edges
    for (const related of concept.relatedTo || []) {
      const toNode = nodeMap.get(related.toLowerCase());
      if (!toNode || toNode.id === fromNode.id) continue;
      const weight = cosineSimilarity(fromNode.embedding, toNode.embedding);
      if (weight >= EDGE_SIMILARITY_THRESHOLD) {
        edges.push({ fromId: fromNode.id, toId: toNode.id, relationshipType: 'related', weight });
      }
    }
  }

  const graph: ConceptGraph = { courseId, nodes, edges, builtAt: new Date() };
  graphCache.set(courseId, graph);
  return graph;
}

/**
 * Computes Personalized PageRank score for a concept node relative to the
 * query concept. Uses a simplified power-iteration approach (3 iterations).
 *
 * PPR(v_q, v) = (1 - d) * I(v == v_q) + d * Σ_{u → v} PPR(v_q, u) / out_degree(u)
 * Where d = PPR_DAMPING = 0.85
 *
 * @param graph      - The course concept graph
 * @param queryNodeId - The node closest to the student's query
 * @returns Map of nodeId → PPR score
 */
function computePersonalizedPageRank(graph: ConceptGraph, queryNodeId: string): Map<string, number> {
  const scores = new Map<string, number>();
  const n = graph.nodes.length;
  if (n === 0) return scores;

  // Initialize: teleport probability focused on query node
  graph.nodes.forEach((node) => {
    scores.set(node.id, node.id === queryNodeId ? 1.0 : 0.0);
  });

  // Build adjacency list
  const outEdges = new Map<string, ConceptEdge[]>();
  graph.nodes.forEach((n) => outEdges.set(n.id, []));
  graph.edges.forEach((e) => outEdges.get(e.fromId)?.push(e));

  // Power iteration (3 passes is sufficient for small graphs)
  for (let iter = 0; iter < 3; iter++) {
    const newScores = new Map<string, number>();
    graph.nodes.forEach((node) => {
      const teleport = node.id === queryNodeId ? (1 - PPR_DAMPING) : 0;
      let propagated = 0;
      graph.edges
        .filter((e) => e.toId === node.id)
        .forEach((e) => {
          const fromScore = scores.get(e.fromId) || 0;
          const outDegree = outEdges.get(e.fromId)?.length || 1;
          propagated += (fromScore / outDegree) * e.weight;
        });
      newScores.set(node.id, teleport + PPR_DAMPING * propagated);
    });
    newScores.forEach((v, k) => scores.set(k, v));
  }

  return scores;
}

/**
 * Expands a student query by identifying the closest concept node in the
 * knowledge graph and appending 1-hop prerequisite concepts.
 *
 * This expanded query is then used to augment the hybrid RAG retrieval,
 * ensuring foundational prerequisite material is always retrieved.
 *
 * @param query     - Original student question
 * @param courseId  - Course identifier
 * @returns GraphExpansionResult with enriched query text
 */
export async function expandQueryWithGraph(
  query: string,
  courseId: string
): Promise<GraphExpansionResult> {
  const graph = graphCache.get(courseId);

  if (!graph || graph.nodes.length === 0) {
    return {
      originalQuery: query,
      expandedQuery: query,
      prerequisiteConcepts: [],
      graphScoreContribution: 0,
    };
  }

  // Find the concept node most similar to the query
  const queryEmbedding = await generateEmbedding(query.substring(0, 256));
  let maxSim = -1;
  let closestNode: ConceptNode | null = null;

  for (const node of graph.nodes) {
    const sim = cosineSimilarity(queryEmbedding, node.embedding);
    if (sim > maxSim) {
      maxSim = sim;
      closestNode = node;
    }
  }

  if (!closestNode || maxSim < 0.3) {
    return { originalQuery: query, expandedQuery: query, prerequisiteConcepts: [], graphScoreContribution: 0 };
  }

  // Compute PPR scores from query concept
  const pprScores = computePersonalizedPageRank(graph, closestNode.id);

  // Get top prerequisite neighbors
  const prereqEdges = graph.edges
    .filter((e) => e.fromId === closestNode!.id && e.relationshipType === 'prerequisite')
    .sort((a, b) => (pprScores.get(b.toId) || 0) - (pprScores.get(a.toId) || 0))
    .slice(0, MAX_GRAPH_EXPANSION);

  const prerequisiteConcepts = prereqEdges
    .map((e) => graph.nodes.find((n) => n.id === e.toId)?.label)
    .filter(Boolean) as string[];

  // Enrich query with prerequisite context
  const expandedQuery =
    prerequisiteConcepts.length > 0
      ? `${query} [Context: Understanding ${prerequisiteConcepts.join(', ')} is foundational to this topic]`
      : query;

  // Compute average PPR score contribution for the expanded concepts
  const avgPprContribution =
    prereqEdges.length > 0
      ? prereqEdges.reduce((sum, e) => sum + (pprScores.get(e.toId) || 0), 0) / prereqEdges.length
      : 0;

  return {
    originalQuery: query,
    expandedQuery,
    prerequisiteConcepts,
    graphScoreContribution: (1 - BETA) * avgPprContribution,
  };
}

/**
 * Returns the cached concept graph for a course, or null if not yet built.
 */
export function getCachedGraph(courseId: string): ConceptGraph | null {
  return graphCache.get(courseId) || null;
}

/**
 * Invalidates the graph cache for a course (e.g., after new documents are uploaded).
 */
export function invalidateGraphCache(courseId: string): void {
  graphCache.delete(courseId);
}
