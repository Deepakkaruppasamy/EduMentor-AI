import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useContextualAction } from '../context/ContextualActionContext';
import { ContextualSelection, ContextualMetadata } from '../types';

export function useTextSelection() {
  const location = useLocation();
  const { setSelection, setMetadata, openToolbar, closeToolbar, isResultOpen } = useContextualAction();
  const isMouseDownRef = useRef(false);

  // Helper to extract page/module context from route
  const getRouteContext = (): Omit<ContextualMetadata, 'url'> => {
    const path = location.pathname;
    let module = 'general';
    let contentId: string | undefined;

    if (path.startsWith('/chat')) {
      module = 'chat';
    } else if (path.startsWith('/notes')) {
      module = 'notes';
    } else if (path.startsWith('/assignment')) {
      module = 'assignments';
    } else if (path.startsWith('/courses') || path.startsWith('/documents')) {
      module = 'courses';
    }

    // Try extracting ID from route parameters
    const params = new URLSearchParams(location.search);
    contentId = params.get('chatId') || params.get('docId') || params.get('id') || undefined;

    return {
      route: path,
      module,
      contentId,
    };
  };

  useEffect(() => {
    let selectionTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleSelectionChange = () => {
      // If result panel is open, don't clear or show new toolbars immediately to prevent visual flashing
      if (isResultOpen) return;

      // Throttle calculation
      if (selectionTimeout) clearTimeout(selectionTimeout);
      selectionTimeout = setTimeout(() => {
        requestAnimationFrame(evaluateSelection);
      }, 250);
    };

    const evaluateSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        // Only close if selection is completely cleared
        if (!isMouseDownRef.current) {
          closeToolbar();
        }
        return;
      }

      const text = selection.toString().trim();
      if (text.length < 3) {
        closeToolbar();
        return;
      }

      const range = selection.getRangeAt(0);
      const containerNode = range.commonAncestorContainer;
      const elementNode = containerNode.nodeType === Node.ELEMENT_NODE
        ? (containerNode as HTMLElement)
        : containerNode.parentElement;

      if (!elementNode) {
        closeToolbar();
        return;
      }

      // Check ignore-list selectors
      const tagName = elementNode.tagName.toUpperCase();
      if (
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        elementNode.hasAttribute('contenteditable') ||
        elementNode.closest('[contenteditable="true"]') ||
        elementNode.closest('code') ||
        elementNode.closest('pre') ||
        elementNode.closest('nav') ||
        elementNode.closest('button') ||
        elementNode.closest('#contextual-action-toolbar') ||
        elementNode.closest('#contextual-action-result') ||
        elementNode.closest('[data-contextual-actions="disabled"]')
      ) {
        closeToolbar();
        return;
      }

      // Must have enabled flag if parent specifies it, or default to standard areas
      const isParentDisabled = elementNode.closest('[data-contextual-actions="disabled"]');
      if (isParentDisabled) {
        closeToolbar();
        return;
      }

      // Compute bounding box
      const rects = range.getClientRects();
      if (rects.length === 0) {
        closeToolbar();
        return;
      }

      // Get last client rect or union box
      const rect = range.getBoundingClientRect();

      // Gather additional context
      const routeCtx = getRouteContext();
      
      // Look for DOM markers for courseId or noteId
      const courseEl = elementNode.closest('[data-course-id]');
      const noteEl = elementNode.closest('[data-note-id]');
      const assignEl = elementNode.closest('[data-assignment-id]');
      const headingEl = elementNode.closest('article, section')?.querySelector('h1, h2, h3, h4');

      const meta: ContextualMetadata = {
        ...routeCtx,
        url: window.location.href,
        courseId: courseEl?.getAttribute('data-course-id') || undefined,
        noteId: noteEl?.getAttribute('data-note-id') || undefined,
        assignmentId: assignEl?.getAttribute('data-assignment-id') || undefined,
        title: headingEl?.textContent || document.title || undefined,
      };

      const selObj: ContextualSelection = {
        text,
        range,
        rect,
        timestamp: Date.now(),
      };

      setSelection(selObj);
      setMetadata(meta);
      openToolbar();
    };

    const handleMouseDown = () => {
      isMouseDownRef.current = true;
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
      // Handle delay selection trigger on mouseUp
      setTimeout(evaluateSelection, 50);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchstart', handleMouseDown);
    document.addEventListener('touchend', handleMouseUp);

    return () => {
      if (selectionTimeout) clearTimeout(selectionTimeout);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchstart', handleMouseDown);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [location, isResultOpen]);
}
