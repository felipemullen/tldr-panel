export type TldrPlatform = 'android' | 'common' | 'linux' | 'osx' | 'sunos' | 'windows';
export const TLDR_PLATFORMS: TldrPlatform[] = ['android', 'common', 'linux', 'osx', 'sunos', 'windows'];

/**
 * Describes an actual markdown TLDR page. A valid URL should point to an existing page in the tldr repository
 */
export type TldrCommandPage = {
    url: string;
};

export type TldrCommandEntry = Partial<Record<TldrPlatform, TldrCommandPage>>;

export interface TldrCommandEntries {
    command: string;
    entries: Record<string, TldrCommandEntry>;
}

/**
 * A mapping that reflects the contents of the tldr repository
 * @example
    const example: TldrCommandMap = {
        'git': {
            command: 'git',
            entries: {
                'en': {
                    'android': {
                        url: ''
                    }
                }
            }
        }
    }
 */
export type TldrCommandMap = Record<string, TldrCommandEntries>;
