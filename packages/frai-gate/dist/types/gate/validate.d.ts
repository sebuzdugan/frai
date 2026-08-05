import { GateResult } from './schema.js';
/** Extracts the Responsible AI Gate section: from its heading to the next heading of the same or higher level. */
export declare function extractGateSection(markdown: string): string | null;
export declare function validateSpec(markdown: string): GateResult;
