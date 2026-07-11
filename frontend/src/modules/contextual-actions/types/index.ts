export interface ContextualSelection {
  text: string;
  range: Range | null;
  rect: DOMRect | null;
  timestamp: number;
}

export interface ContextualMetadata {
  route: string;
  module: string; // e.g. 'notes', 'assignments', 'courses', 'chat'
  contentId?: string;
  courseId?: string;
  assignmentId?: string;
  noteId?: string;
  title?: string;
  url: string;
}

export type ActionId =
  | 'explain'
  | 'ask-ai'
  | 'generate-quiz'
  | 'create-flashcards'
  | 'translate'
  | 'listen-aloud'
  | 'bookmark'
  | 'add-study-plan'
  | 'cite-source'
  | 'copy'
  | 'share'
  | 'check-originality'
  | 'assignment-feedback'
  | 'explain-mistakes'
  | 'ask-faculty';

export interface ContextualAction {
  id: ActionId;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  allowedModules?: string[]; // undefined = all
  allowedRoles?: string[];   // undefined = all
  requiresAI?: boolean;
  requiresAuthentication?: boolean;
  mobilePriority: number; // lower number = higher priority
  desktopPriority: number;
}
