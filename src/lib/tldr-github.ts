import fetch from 'node-fetch';
import { Progress, window } from 'vscode';
import { GithubContentsItem, GithubTreeResponse } from '../model/github.model';
import { Memory } from './memory';
import { TldrCommandMap, TldrCommandEntry, TldrPlatform, TldrCommandPage } from '../model/tldr-panel.model';

type NotificationProgress = {
    message?: string | undefined;
    increment?: number | undefined;
};

export class TldrGithub {
    private _memory: Memory;

    constructor(memory: Memory) {
        this._memory = memory;
    }

    /**
     * Retrieves markdown content from an existing page in https://github.com/tldr-pages/tldr/tree/main/
     * and returns it as a string. Will return error strings if the operation fails
     * @param command a valid shell command, i.e. ls, git, cat, grep, etc
     */
    public async getCommandInfo(progress: Progress<NotificationProgress>, command: string) {
        if (!(command in this._memory.cachedPageDirectory)) {
            progress.report({ increment: 100 });
            window.showErrorMessage('TLDR Panel: Command does not exist');
            return 'Command does not exist';
        }

        progress.report({ increment: 0 });

        const root = this._memory.cachedPageDirectory[command];
        const lang = root.entries[this._memory.defaultLanguage];
        const entry = lang[this._memory.defaultPlatform] || lang.common || this._firstEntry(lang);

        if (entry) {
            const response = await fetch(entry.url);
            progress.report({ increment: 50 });

            if (!response.ok) {
                progress.report({ increment: 50 });
                return `TLDR: Unable to retrieve document. Http status code ${response.status}`;
            }

            const markdownContents = await response.text();
            progress.report({ increment: 50 });

            return markdownContents;
        }

        progress.report({ increment: 100 });
        return 'TLDR: Unable to load page';
    }

    /**
     * Caches a listing of pages from https://github.com/tldr-pages/tldr/tree/main/ and stores the data
     * as a map of commands with available languages and platforms. Will not refetch if the cache has not
     * expired, according to `tldr-panel.cacheTimeoutMinutes` specified in [package.json](../../package.json)
     * @param forcedUpdate forces the operation to continue even if the cache is not expired
     */
    public async cacheCommands(progress: Progress<NotificationProgress>, forcedUpdate = false) {
        if (!forcedUpdate && this._memory.commandList && !this._memory.cacheIsExpired) {
            console.log('[tldr-panel] Cache already exists');

            progress.report({ increment: 100 });
            return;
        }

        console.log('[tldr-panel] Cache refresh is required');

        progress.report({ increment: 30 });

        try {
            const url = 'https://api.github.com/repos/tldr-pages/tldr/git/trees/main?recursive=0';
            const response = await fetch(url);

            if (!response.ok) {
                window.showErrorMessage(`TLDR: unable to cache commands. Github api returned status code ${response.status}`);
                return;
            }

            progress.report({ increment: 20 });
            const data = await response.json() as GithubTreeResponse;

            this._mapGithubTreeData(data.tree, progress);

            progress.report({ increment: 50 });
        } catch (error) {
            window.showErrorMessage('TLDR: unable to cache commands. Please check your network connection and try again.');
            console.error('[tldr-panel] Error caching commands:', error);
        }

    }

    /**
     * Returns the first page found for a given command. This is used as a last resort by {@link getCommandInfo}
     * when the command is not present in the desired language or platform
     */
    private _firstEntry(language: TldrCommandEntry): TldrCommandPage {
        const key = Object.keys(language)[0];
        return language[key as TldrPlatform]!;
    }

    /**
     * Converts the results from Github's api into a {@link TldrCommandMap} and stores them in {@link Memory.cachedPageDirectory}
     */
    private _mapGithubTreeData(treeData: GithubContentsItem[], progress: Progress<NotificationProgress>) {
        const languages = new Set<string>();

        const size = treeData.length;
        const pages = treeData.reduce((commandMap, item) => {
            const path = item.path;
            const validPath = /^pages.+\.md$/;

            if (item.type === 'blob' && validPath.test(path)) {
                const pageKey = path.match(/^(pages\/|pages\.[a-z]{2}[_A-Z]*)/)?.[0].replace(/\//g, '')!;
                const language = pageKey.replace(/^pages[\.]*/, '') || 'en';
                const file = path.match(/[a-z0-9_\-\+\[\!\.]+\.md$/)?.[0]!;
                const platform = path.replace(pageKey, '').replace(file, '').replace(/\//g, '') as TldrPlatform;
                const command = file.replace('.md', '');

                if (!(command in commandMap)) {
                    commandMap[command] = {
                        command,
                        entries: {}
                    };
                }

                if (!(language in commandMap[command].entries)) {
                    languages.add(language);
                    commandMap[command].entries[language] = {};
                }

                commandMap[command].entries[language][platform] = {
                    url: `https://raw.githubusercontent.com/tldr-pages/tldr/main/${item.path}`
                };
            }

            progress.report({ increment: (50 / size) });

            return commandMap;
        }, {} as TldrCommandMap);

        if (Object.keys(pages).length === 0) {
            window.showErrorMessage('TLDR: unable to cache commands. Please try again later.');
            return;
        }

        this._memory.updateCache(pages, Array.from(languages));
    }
}