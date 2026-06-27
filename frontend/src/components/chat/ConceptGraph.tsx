import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ConceptNode {
  concept: string;
  children?: ConceptNode[];
}

interface ConceptGraphProps {
  graph: ConceptNode;
}

export const ConceptGraph: React.FC<ConceptGraphProps> = ({ graph }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!graph || !graph.concept) return null;

  return (
    <div className="glass-card mt-3 p-4 border border-white/5 shadow-inner w-full max-w-lg bg-[#0e1017]/85 backdrop-blur-md rounded-2xl">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-sm">🧠</span>
          <span className="text-[10px] font-bold text-white/55 uppercase tracking-wider">Concept Relationship Map</span>
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[9px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-2 py-0.5 rounded-lg transition-all"
        >
          {isExpanded ? 'Hide Map' : 'Show Map'}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <ConceptTreeNode node={graph} isLast={true} level={0} parentLineMap={[]} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ConceptTreeNode: React.FC<{ node: ConceptNode; isLast: boolean; level: number; parentLineMap: boolean[] }> = ({ node, isLast, level, parentLineMap }) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  // Render indentations and connector lines
  const renderIndents = () => {
    const indents = [];
    for (let i = 0; i < level; i++) {
      const showVerticalLine = parentLineMap[i];
      indents.push(
        <div 
          key={i} 
          className="w-5 flex-shrink-0 flex justify-center items-stretch"
        >
          {showVerticalLine && (
            <div className="w-[1px] bg-indigo-500/25" />
          )}
        </div>
      );
    }
    return indents;
  };

  return (
    <div className="flex flex-col select-none">
      {/* Node Row */}
      <div className="flex items-stretch min-h-[28px]">
        {/* Indentations */}
        {renderIndents()}

        {/* Tree Branch Line Connector */}
        {level > 0 && (
          <div className="w-5 flex-shrink-0 flex items-stretch relative">
            {/* Vertical Line Segment */}
            <div className={`w-[1px] bg-indigo-500/25 ${isLast ? 'h-[14px] self-start' : 'h-full'}`} />
            {/* Horizontal Line Connector */}
            <div className="absolute top-[14px] left-[10px] right-0 h-[1px] bg-indigo-500/25" />
          </div>
        )}

        {/* Concept Card Tag */}
        <div className="flex items-center py-0.5">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            onClick={() => hasChildren && setIsOpen(!isOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-semibold cursor-pointer transition-all ${
              level === 0 
                ? 'bg-gradient-to-r from-primary-600/20 to-purple-600/20 border-primary-500/30 text-primary-300' 
                : hasChildren 
                  ? 'bg-indigo-950/20 border-indigo-500/15 text-indigo-300 hover:border-indigo-500/30' 
                  : 'bg-white/[0.02] border-white/5 text-white/60 hover:border-white/10 hover:text-white'
            }`}
          >
            <span>{hasChildren ? (isOpen ? '📂' : '📁') : '•'}</span>
            <span className="truncate max-w-[160px]">{node.concept}</span>
            {hasChildren && (
              <span className="text-[8px] text-white/30 ml-0.5">
                ({node.children?.length})
              </span>
            )}
          </motion.div>
        </div>
      </div>

      {/* Children list */}
      {hasChildren && isOpen && (
        <div className="flex flex-col">
          {node.children?.map((child, idx) => {
            const isChildLast = idx === (node.children?.length ?? 0) - 1;
            // The vertical line continues for this level if the parent is NOT the last child
            const nextLineMap = [...parentLineMap, !isLast];
            return (
              <ConceptTreeNode 
                key={idx} 
                node={child} 
                isLast={isChildLast} 
                level={level + 1} 
                parentLineMap={nextLineMap} 
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
