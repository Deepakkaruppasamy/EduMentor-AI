import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConceptMapProps {
  conceptMapText: string;
}

interface parsedNode {
  id: string;
  label: string;
  level: number;
  parentId: string | null;
  x: number;
  y: number;
}

export const ConceptMap: React.FC<ConceptMapProps> = ({ conceptMapText }) => {
  const [selectedNode, setSelectedNode] = useState<parsedNode | null>(null);

  // Parse lines to build hierarchy and assign coordinates
  const nodes = useMemo(() => {
    if (!conceptMapText) return [];
    
    const lines = conceptMapText.split('\n').filter(l => l.trim().length > 0);
    const result: parsedNode[] = [];
    const parentsStack: { id: string; level: number }[] = [];

    // Parse indentation and labels
    lines.forEach((line, index) => {
      // Find indentation level (spaces or tabs)
      const leadingWhitespace = line.match(/^\s*/)?.[0] || '';
      const level = leadingWhitespace.length;
      
      // Clean clean labels
      const cleanLabel = line.trim()
        .replace(/^[-*+•] /, '') // Bullet symbols
        .replace(/^\d+\.\s+/, '') // Numeric lists
        .trim();

      if (!cleanLabel) return;

      const nodeId = `node_${index}`;

      // Manage parent stack
      while (parentsStack.length > 0 && parentsStack[parentsStack.length - 1].level >= level) {
        parentsStack.pop();
      }

      const parentId = parentsStack.length > 0 ? parentsStack[parentsStack.length - 1].id : null;
      parentsStack.push({ id: nodeId, level });

      result.push({
        id: nodeId,
        label: cleanLabel,
        level,
        parentId,
        x: 0,
        y: 0,
      });
    });

    // Group nodes by level to allocate X and Y coordinates
    const levelsMap = new Map<number, parsedNode[]>();
    result.forEach(node => {
      const group = levelsMap.get(node.level) || [];
      group.push(node);
      levelsMap.set(node.level, group);
    });

    const sortedLevels = Array.from(levelsMap.keys()).sort((a, b) => a - b);
    
    // Allocate Y coordinate from 0 to 100 based on hierarchy level
    sortedLevels.forEach((levelVal, levelIdx) => {
      const group = levelsMap.get(levelVal) || [];
      const yCoord = 15 + levelIdx * 25; // 15%, 40%, 65%, 90%
      
      group.forEach((node, nodeIdx) => {
        // Allocate X coordinate evenly from 10% to 90%
        const xCoord = group.length === 1 
          ? 50 
          : 12 + (nodeIdx / (group.length - 1)) * 76;

        node.y = yCoord;
        node.x = xCoord;
      });
    });

    return result;
  }, [conceptMapText]);

  // Construct links between parents and children
  const links = useMemo(() => {
    const linesList: { x1: number; y1: number; x2: number; y2: number; id: string }[] = [];
    nodes.forEach(node => {
      if (node.parentId) {
        const parent = nodes.find(n => n.id === node.parentId);
        if (parent) {
          linesList.push({
            x1: parent.x,
            y1: parent.y,
            x2: node.x,
            y2: node.y,
            id: `${parent.id}-${node.id}`,
          });
        }
      }
    });
    return linesList;
  }, [nodes]);

  return (
    <div className="space-y-4">
      {/* Interactive Map Board */}
      <div 
        className="w-full h-80 rounded-2xl relative overflow-hidden border border-white/5"
        style={{ background: 'radial-gradient(circle at center, rgba(16,18,27,0.7) 0%, rgba(10,11,15,0.95) 100%)' }}
      >
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.02]" 
          style={{ 
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', 
            backgroundSize: '16px 16px' 
          }} 
        />

        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <linearGradient id="linkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4f5dc8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#7c6fc2" stopOpacity="0.2" />
            </linearGradient>
            <filter id="nodeGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Render connecting links (Cubic curves) */}
          {links.map(link => {
            if (
              typeof link?.x1 !== 'number' || typeof link?.y1 !== 'number' ||
              typeof link?.x2 !== 'number' || typeof link?.y2 !== 'number' ||
              isNaN(link.x1) || isNaN(link.y1) || isNaN(link.x2) || isNaN(link.y2)
            ) {
              return null;
            }
            const path = `M ${link.x1} ${link.y1} C ${link.x1} ${(link.y1 + link.y2) / 2}, ${link.x2} ${(link.y1 + link.y2) / 2}, ${link.x2} ${link.y2}`;
            return (
              <motion.path
                key={link.id}
                d={path}
                stroke="url(#linkGrad)"
                strokeWidth="1.5"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.4 }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            );
          })}

          {/* Render Nodes */}
          {nodes.map(node => {
            const isSelected = selectedNode?.id === node.id;
            const nodeColor = node.level === 0 
              ? '#4f5dc8' // Primary blue for root
              : node.level <= 2 
              ? '#6359a8' // Purple for main concepts
              : '#4da89a'; // Sky blue for leaf nodes

            return (
              <g key={node.id} className="cursor-pointer" onClick={() => setSelectedNode(node)}>
                {/* Glow ring */}
                {isSelected && (
                  <motion.circle
                    cx={`${node.x}%`}
                    cy={`${node.y}%`}
                    r="9"
                    fill="none"
                    stroke={nodeColor}
                    strokeWidth="1"
                    animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}

                {/* Main Node Point */}
                <motion.circle
                  cx={`${node.x}%`}
                  cy={`${node.y}%`}
                  r={node.level === 0 ? '7' : '5.5'}
                  fill={isSelected ? '#fff' : nodeColor}
                  stroke={isSelected ? nodeColor : '#1a1d27'}
                  strokeWidth="2"
                  filter={isSelected ? 'url(#nodeGlow)' : 'none'}
                  whileHover={{ scale: 1.3 }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                />

                {/* Node Label Text */}
                <text
                  x={`${node.x}%`}
                  y={`${node.y - 3}%`}
                  textAnchor="middle"
                  fill={isSelected ? '#fff' : 'rgba(255,255,255,0.6)'}
                  style={{
                    fontSize: node.level === 0 ? '10px' : '8px',
                    fontWeight: isSelected || node.level === 0 ? 'bold' : 'normal',
                    userSelect: 'none',
                    letterSpacing: '0.02em',
                  }}
                  className="transition-colors duration-200"
                >
                  {node.label.length > 18 ? node.label.substring(0, 16) + '..' : node.label}
                </text>
              </g>
            );
          })}
        </svg>
        
        {/* Info Overlay */}
        <div className="absolute bottom-3 left-4 text-[9px] text-white/30 pointer-events-none uppercase tracking-widest font-mono">
          🔍 Click nodes to inspect structure
        </div>
      </div>

      {/* Selected Node Details Card */}
      <AnimatePresence mode="wait">
        {selectedNode ? (
          <motion.div
            key={selectedNode.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="rounded-xl p-4 border border-white/[0.04] relative"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-primary-400">
                  Concept Detail (Level {selectedNode.level})
                </span>
                <h4 className="text-xs font-bold text-white mt-0.5">{selectedNode.label}</h4>
              </div>
              <button 
                onClick={() => setSelectedNode(null)} 
                className="text-white/20 hover:text-white transition-colors text-xs"
              >
                ✕ Close
              </button>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed mt-2 font-light">
              This node represents the core learning branch **{selectedNode.label}**. Open the AI Chat Tutor to ask targeted questions about this sub-theme, or request a customized quiz covering this specific topic.
            </p>
          </motion.div>
        ) : (
          <div className="text-center py-4 rounded-xl border border-dashed border-white/5 text-[10px] text-white/25">
            Select a mapping node above to explore branch details
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
