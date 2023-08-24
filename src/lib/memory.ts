import { Memento, ViewColumn, WorkspaceConfiguration, workspace } from 'vscode';
import { TldrCommandMap, TldrPlatform } from '../model/tldr-panel.model';
import { TldrGithub } from './tldr-github';

export const TLDR_CONFIG_KEY = 'tldr-panel';

export enum TldrPanelConfigKeys {
    cacheTimeout = 'cacheTimeoutMinutes',
    showDebugInfo = 'showDebugInfo',
    defaultLanguage = 'defaultLanguage',
    defaultPlatform = 'defaultPlatform',
    panelPosition = 'panelPosition'
}

export enum TldrPanelStorageKeys {
    lastUpdate = 'tldr-panel:lastUpdate',
    cachedPages = 'tldr-panel:pages',
    languages = 'tldr-panel:languages'
}

export class Memory {
    private _storageContext: Memento;
    private _config: WorkspaceConfiguration;

    constructor(storage: Memento) {
        this._storageContext = storage;
        this._config = workspace.getConfiguration(TLDR_CONFIG_KEY);
    }

    /**
     * Determines wether to show debugging information in page results.
     * If true, will display information about resolved language and platforms.
     */
    public get showDebugInfo() {
        return this._config.get<boolean>(TldrPanelConfigKeys.showDebugInfo) || false;
    }

    /**
     * Default language to retrieve documentation for.
     * Will fallback to english if documentation is not found.
     */
    public get defaultLanguage() {
        return this._config.get<string>(TldrPanelConfigKeys.defaultLanguage)!;
    }

    /**
     * Default platform to retrieve documentation for.
     * Will be set to your current platform and use \"common\" as a fallback if documentation is not found.
     */
    public get defaultPlatform() {
        const configPlatform = this._config.get<TldrPlatform>(TldrPanelConfigKeys.defaultPlatform)!;
        if (configPlatform) {
            return configPlatform;
        }

        switch (process.platform) {
            case 'aix': return 'common';
            case 'darwin': return 'osx';
            case 'freebsd': return 'common';
            case 'linux': return 'linux';
            case 'openbsd': return 'common';
            case 'sunos': return 'sunos';
            case 'win32': return 'windows';
            default: return 'common';
        }
    }

    /**
     * Time specification in minutes between command cache refreshes.
     * Default is 43200 (30 days).
     */
    public get cacheUpdateInterval() {
        return this._config.get<number>(TldrPanelConfigKeys.cacheTimeout)!;
    }

    /**
     * Determines if the command should be displayed as a tab in the current panel or in a new panel on the side.
     */
    public get panelPosition() {
        const configValue = this._config.get<string>(TldrPanelConfigKeys.panelPosition);
        return configValue === 'active' ? ViewColumn.Active : ViewColumn.Beside;
    }

    public get cacheIsExpired() {
        if (!this.cachedPageDirectory) {
            return true;
        }

        const cacheUpdatedDate = this._storageContext.get<number>(TldrPanelStorageKeys.lastUpdate, 0);
        const expiryTime = cacheUpdatedDate + (this.cacheUpdateInterval * 1000);

        return Date.now() > expiryTime;
    }

    /**
     * A list of pages cached from https://github.com/tldr-pages/tldr/tree/main/
     * caching takes place in {@link TldrGithub.cacheCommands}
     */
    public get cachedPageDirectory() {
        return this._storageContext.get<TldrCommandMap>(TldrPanelStorageKeys.cachedPages)!;
    }

    public get commandList() {
        return Object.keys(this.cachedPageDirectory).sort();
    }

    public get languageList() {
        return this._storageContext.get<string[]>(TldrPanelStorageKeys.languages)!;
    }

    public updateCache(pages: TldrCommandMap, languages: string[]) {
        this._storageContext.update(TldrPanelStorageKeys.cachedPages, pages);
        this._storageContext.update(TldrPanelStorageKeys.languages, languages);

        const time = Date.now();
        this._storageContext.update(TldrPanelStorageKeys.lastUpdate, time);
    }

    public async setDefaultLanguage(newDefault?: string) {
        await this._config.update(TldrPanelConfigKeys.defaultLanguage, newDefault, true);
    }

    public async setPlatformOverride(override?: TldrPlatform) {
        await this._config.update(TldrPanelConfigKeys.defaultPlatform, override, true);
    }
}