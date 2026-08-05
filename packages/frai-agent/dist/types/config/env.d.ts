export interface ResolveEnvOptions {
    root?: string;
}
export declare const resolveWorkingDirectory: (root?: string) => string;
export declare const resolveOpenAiApiKey: (options?: ResolveEnvOptions) => any;
export declare const requireOpenAiApiKey: (options?: ResolveEnvOptions) => any;
