import { Memento, WorkspaceConfiguration } from 'vscode';
import { TldrPanelConfigKeys } from '../src/lib/memory';

export enum ViewColumn {
    Active = -1,
    Beside = -2
}

export enum ProgressLocation {
    SourceControl = 1,
    Window = 10,
    Notification = 15
}

let _storage = {} as Record<string, any>;
export const mockGlobalState: Memento = {
    keys: jest.fn(),
    get: jest.fn().mockImplementation((key: string) => {
        const value = _storage[key];
        return value;
    }),
    update: jest.fn().mockImplementation(async (key: string, value: any) => {
        _storage[key] = value;
    })
};

let _config = {} as Record<string, any>;
export const mockConfiguration: WorkspaceConfiguration = {
    has: jest.fn(),
    inspect: jest.fn(),
    get: jest.fn().mockImplementation((key: string) => {
        const value = _config[key];
        if (key === TldrPanelConfigKeys.panelPosition) {
            return _config[key] || 'active';
        } else if (key === TldrPanelConfigKeys.cacheTimeout) {
            return _config[key] || 43200;
        }

        return value;
    }),
    update: jest.fn().mockImplementation(async (key: string, value: any) => {
        _config[key] = value;
    })
};

export const Uri = {
    parse: jest.fn().mockImplementation((input: string) => input)
}

export const window = {
    showQuickPick: jest.fn(),
    showErrorMessage: jest.fn(),
    withProgress: jest.fn().mockImplementation((_options, progressCallback) => {
        if (progressCallback) {
            let mockProgress: any = {
                report: jest.fn()
            };
            progressCallback(mockProgress);
        }
    })
}

export function _resetWorkspace() {
    _config = {};
    _storage = {};
}

export const workspace = {
    registerTextDocumentContentProvider: jest.fn(),
    getConfiguration: jest.fn().mockReturnValue(mockConfiguration)
} as any;

export const commands = {
    executeCommand: jest.fn(),
    registerCommand: jest.fn()
}