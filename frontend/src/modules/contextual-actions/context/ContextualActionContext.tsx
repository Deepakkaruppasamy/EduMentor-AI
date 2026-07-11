import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ContextualSelection, ContextualMetadata, ActionId } from '../types';

interface ContextualActionContextType {
  selection: ContextualSelection | null;
  metadata: ContextualMetadata | null;
  activeAction: ActionId | null;
  isToolbarOpen: boolean;
  isResultOpen: boolean;
  isLoading: boolean;
  resultData: any;
  error: string | null;

  setSelection: (sel: ContextualSelection | null) => void;
  setMetadata: (meta: ContextualMetadata | null) => void;
  setActiveAction: (action: ActionId | null) => void;
  openToolbar: () => void;
  closeToolbar: () => void;
  openResult: () => void;
  closeResult: () => void;
  startLoading: () => void;
  stopLoading: () => void;
  setResultData: (data: any) => void;
  setError: (err: string | null) => void;
  clearAll: () => void;
}

const ContextualActionContext = createContext<ContextualActionContextType | undefined>(undefined);

export const ContextualActionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selection, setSelection] = useState<ContextualSelection | null>(null);
  const [metadata, setMetadata] = useState<ContextualMetadata | null>(null);
  const [activeAction, setActiveAction] = useState<ActionId | null>(null);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const openToolbar = () => setIsToolbarOpen(true);
  const closeToolbar = () => setIsToolbarOpen(false);
  const openResult = () => setIsResultOpen(true);
  const closeResult = () => {
    setIsResultOpen(false);
    setActiveAction(null);
  };
  const startLoading = () => {
    setIsLoading(true);
    setError(null);
  };
  const stopLoading = () => setIsLoading(false);

  const clearAll = () => {
    setSelection(null);
    setMetadata(null);
    setActiveAction(null);
    setIsToolbarOpen(false);
    setIsResultOpen(false);
    setIsLoading(false);
    setResultData(null);
    setError(null);
  };

  return (
    <ContextualActionContext.Provider
      value={{
        selection,
        metadata,
        activeAction,
        isToolbarOpen,
        isResultOpen,
        isLoading,
        resultData,
        error,
        setSelection,
        setMetadata,
        setActiveAction,
        openToolbar,
        closeToolbar,
        openResult,
        closeResult,
        startLoading,
        stopLoading,
        setResultData,
        setError,
        clearAll,
      }}
    >
      {children}
    </ContextualActionContext.Provider>
  );
};

export const useContextualAction = () => {
  const context = useContext(ContextualActionContext);
  if (context === undefined) {
    throw new Error('useContextualAction must be used within a ContextualActionProvider');
  }
  return context;
};
