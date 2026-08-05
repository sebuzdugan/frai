import { Finding } from '../gate/schema.js';
/**
 * Scans the repository at `cwd` with a read-only Claude Agent SDK session and drafts
 * a filled-in "## Responsible AI Gate" section grounded in the actual code.
 */
export declare function draftGateSection(cwd: string): Promise<string>;
/**
 * Adversarially reviews an already-valid gate section for quality: vague answers,
 * untestable claims, thresholds that don't match the code. Returns extra findings.
 */
export declare function smartReview(specMarkdown: string, cwd: string): Promise<Finding[]>;
