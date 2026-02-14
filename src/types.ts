
export enum ToolType {
  COUNTER = 'counter',
  SPLITTER = 'splitter',
  REFORMATTER = 'reformatter',
  DIFF = 'diff',
  JSON = 'json',
  HTML = 'html',
  MARKDOWN = 'markdown',
  AI_ASSISTANT = 'ai_assistant',
  ABOUT = 'about'
}

export interface TextStats {
  characters: number;
  words: number;
  lines: number;
  sentences: number;
  paragraphs: number;
  readingTime: number;
}

export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}
