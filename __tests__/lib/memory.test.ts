import { Memory, TldrPanelConfigKeys, TldrPanelStorageKeys } from '../../src/lib/memory';
import { _resetWorkspace, mockConfiguration, mockGlobalState } from '../../__mocks__/vscode';
import { ViewColumn } from 'vscode';
import { TldrCommandMap } from '../../src/model/tldr-panel.model';

describe('Memory', () => {
    let memory: Memory;
    let actualPlatform: string;

    beforeEach(() => {
        memory = new Memory(mockGlobalState);

        actualPlatform = process.platform;
        Object.defineProperty(process, 'platform', {
            value: 'MockOS'
        });
    });

    afterEach(() => {
        _resetWorkspace();
        Object.defineProperty(process, 'platform', {
            value: actualPlatform
        });
        (mockConfiguration.get as jest.Mock).mockClear();
    });

    describe('showDebugInfo', () => {
        it('should return false if config key is not set', () => {
            const debugInfo = memory.showDebugInfo;

            expect(debugInfo).toBe(false);
            expect(mockConfiguration.get).toHaveBeenCalledWith(TldrPanelConfigKeys.showDebugInfo);
            expect(mockConfiguration.get).toHaveBeenCalledTimes(1);
        });

        it('should return the config value if set', () => {
            mockConfiguration.update(TldrPanelConfigKeys.showDebugInfo, true);
            expect(memory.showDebugInfo).toBe(true);

            mockConfiguration.update(TldrPanelConfigKeys.showDebugInfo, false);
            expect(memory.showDebugInfo).toBe(false);
        });
    });

    describe('defaultLanguage', () => {
        it('should return "en" if config key is not set', () => {
            const language = memory.defaultLanguage;

            expect(language).toBe('en');
            expect(mockConfiguration.get).toHaveBeenCalledWith(TldrPanelConfigKeys.defaultLanguage);
            expect(mockConfiguration.get).toHaveBeenCalledTimes(1);
        });

        it('should return the preferred language value if set', () => {
            mockConfiguration.update(TldrPanelConfigKeys.defaultLanguage, 'pt_BR');
            expect(memory.defaultLanguage).toBe('pt_BR');

            mockConfiguration.update(TldrPanelConfigKeys.defaultLanguage, '');
            expect(memory.defaultLanguage).toBe('en');
        });
    });

    describe('defaultPlatform', () => {
        it('should return value from configuration if set', () => {
            mockConfiguration.update(TldrPanelConfigKeys.defaultPlatform, 'PLATFORM');
            const platform = memory.defaultPlatform;

            expect(platform).toBe('PLATFORM');
            expect(mockConfiguration.get).toHaveBeenCalledWith(TldrPanelConfigKeys.defaultPlatform);
            expect(mockConfiguration.get).toHaveBeenCalledTimes(1);
        });

        it('should determine user platform if configuration is not set', () => {
            expect(process.platform).toBe('MockOS');

            const platform = memory.defaultPlatform;
            expect(platform).toBe('common');
        });

        it('returns only valid tldr platforms', () => {
            expect(mockConfiguration.get(TldrPanelConfigKeys.defaultPlatform)).toBe(undefined);

            const tests = [
                { input: 'aix', output: 'common' },
                { input: 'darwin', output: 'osx' },
                { input: 'freebsd', output: 'common' },
                { input: 'linux', output: 'linux' },
                { input: 'openbsd', output: 'common' },
                { input: 'sunos', output: 'sunos' },
                { input: 'win32', output: 'windows' },
                { input: 'nonexistent', output: 'common' },
                { input: '', output: 'common' },
                { input: undefined, output: 'common' },
            ];

            for (const test of tests) {
                Object.defineProperty(process, 'platform', {
                    value: test.input
                });
                expect(memory.defaultPlatform).toBe(test.output);
            }
        });
    });

    describe('cacheUpdateInterval', () => {
        it('should return "43200" if config key is not set', () => {
            const interval = memory.cacheUpdateInterval;

            expect(interval).toBe(43200);
            expect(mockConfiguration.get).toHaveBeenCalledWith(TldrPanelConfigKeys.cacheTimeout);
            expect(mockConfiguration.get).toHaveBeenCalledTimes(1);
        });

        it('should return the update interval value if set', () => {
            mockConfiguration.update(TldrPanelConfigKeys.cacheTimeout, 10);
            expect(memory.cacheUpdateInterval).toBe(10);

            mockConfiguration.update(TldrPanelConfigKeys.cacheTimeout, undefined);
            expect(memory.cacheUpdateInterval).toBe(43200);
        });
    });

    describe('panelPosition', () => {
        it('should return "active" if config key is not set', () => {
            const position = memory.panelPosition;

            expect(position).toBe(ViewColumn.Active);
            expect(mockConfiguration.get).toHaveBeenCalledWith(TldrPanelConfigKeys.panelPosition);
            expect(mockConfiguration.get).toHaveBeenCalledTimes(1);
        });

        it('should return the preferred panel setting value if set', () => {
            mockConfiguration.update(TldrPanelConfigKeys.panelPosition, 'beside');
            expect(memory.panelPosition).toBe(ViewColumn.Beside);

            mockConfiguration.update(TldrPanelConfigKeys.panelPosition, 'active');
            expect(memory.panelPosition).toBe(ViewColumn.Active);

            mockConfiguration.update(TldrPanelConfigKeys.panelPosition, undefined);
            expect(memory.panelPosition).toBe(ViewColumn.Active);
        });
    });

    describe('cacheIsExpired', () => {
        it('should return true if no pages are cached', () => {
            expect(mockGlobalState.get(TldrPanelStorageKeys.cachedPages)).toBe(undefined);

            const isExpired = memory.cacheIsExpired;

            expect(isExpired).toBe(true);
            expect(mockConfiguration.get).not.toHaveBeenCalledWith(TldrPanelStorageKeys.lastUpdate);
        });

        it('should return true if cache was updated earlier than expected refresh date', () => {
            const pages: TldrCommandMap = {
                'git': {
                    command: 'git',
                    entries: {}
                }
            };
            mockGlobalState.update(TldrPanelStorageKeys.cachedPages, pages);
            expect(mockGlobalState.get(TldrPanelStorageKeys.cachedPages)).toBe(pages);

            const thirtyDaysMin = (30 * 24 * 60);
            mockConfiguration.update(TldrPanelConfigKeys.cacheTimeout, thirtyDaysMin);

            const thirtyDaysMs = (30 * 24 * 60 * 60 * 1000);
            const longAgo = new Date(Date.now() - thirtyDaysMs - 1);
            mockGlobalState.update(TldrPanelStorageKeys.lastUpdate, longAgo.getTime());

            const isExpired = memory.cacheIsExpired;
            expect(isExpired).toBe(true);
        });

        it('should return false if cache was updated within interval time', () => {
            const pages: TldrCommandMap = {
                'git': {
                    command: 'git',
                    entries: {}
                }
            };
            mockGlobalState.update(TldrPanelStorageKeys.cachedPages, pages);
            expect(mockGlobalState.get(TldrPanelStorageKeys.cachedPages)).toBe(pages);

            const thirtyDaysMin = (30 * 24 * 60);
            mockConfiguration.update(TldrPanelConfigKeys.cacheTimeout, thirtyDaysMin);

            const thirtyDaysMs = (30 * 24 * 60 * 60 * 1000);
            const notLongEnoughAgo = new Date(Date.now() - thirtyDaysMs + 1);
            mockGlobalState.update(TldrPanelStorageKeys.lastUpdate, notLongEnoughAgo.getTime());

            const isExpired = memory.cacheIsExpired;
            expect(isExpired).toBe(false);
        });
    });

    describe('cachedPageDirectory', () => {
        it('should call storage to retrieve pages cache', () => {
            const pages = memory.cachedPageDirectory;
            expect(pages).toEqual({});
            expect(mockGlobalState.get).toHaveBeenCalledWith(TldrPanelStorageKeys.cachedPages);
            expect(mockGlobalState.get).toHaveBeenCalledTimes(1);
        });

        it('should return cached value if it exists', () => {
            const pages: TldrCommandMap = {
                'git': {
                    command: 'git',
                    entries: {}
                }
            };
            mockGlobalState.update(TldrPanelStorageKeys.cachedPages, pages);
            expect(mockGlobalState.get(TldrPanelStorageKeys.cachedPages)).toBe(pages);
        });
    });

    describe('commandList', () => {
        it('list of commands is an empty array if there are no cached pages', () => {
            const commandList = memory.commandList;
            expect(commandList).toBeInstanceOf(Array);
            expect(commandList.length).toBe(0);
        });

        it('list of commands is sorted and based on cached page keys', () => {
            const pages = {
                'git': {},
                'cat': {},
                'ls': {}
            };
            mockGlobalState.update(TldrPanelStorageKeys.cachedPages, pages);

            const commandList = memory.commandList;
            expect(commandList.length).toBe(3);
            expect(commandList[0]).toBe('cat');
            expect(commandList[1]).toBe('git');
            expect(commandList[2]).toBe('ls');
        });
    });

    describe('languageList', () => {
        it('list of languages is an empty array if there are no cached pages', () => {
            const languageList = memory.languageList;
            expect(languageList).toBeInstanceOf(Array);
            expect(languageList.length).toBe(0);
        });

        it('list of languages is stored in global context', () => {
            const languages = ['en', 'pt_BR', 'it', 'es'];
            mockGlobalState.update(TldrPanelStorageKeys.languages, languages);

            const memoryLanguages = memory.languageList;
            expect(memoryLanguages).toEqual([...languages]);
        });
    });

    describe('updateCache', () => {
        it('will call update for expected keys', () => {
            const dateNow = Date.now;
            Date.now = jest.fn().mockReturnValueOnce('agora');

            const pages = {
                'git': {},
                'cat': {},
                'ls': {}
            } as any;
            const languages = ['en', 'pt_BR', 'it', 'es'];
            memory.updateCache(pages, languages);

            expect(Date.now).toHaveBeenCalled();
            expect(mockGlobalState.update).toHaveBeenCalledTimes(3);
            expect(mockGlobalState.update).toHaveBeenCalledWith(TldrPanelStorageKeys.cachedPages, pages);
            expect(mockGlobalState.update).toHaveBeenCalledWith(TldrPanelStorageKeys.languages, languages.sort());
            expect(mockGlobalState.update).toHaveBeenCalledWith(TldrPanelStorageKeys.lastUpdate, 'agora');

            Date.now = dateNow;
        });

        it('will sort languages before storing', () => {
            const languages = ['z', 'en', 'pt_BR', 'it', 'es', 'a'];
            const sortedLanguages = ['a', 'en', 'es', 'it', 'pt_BR', 'z'];
            memory.updateCache({}, languages);

            expect(mockGlobalState.update).toHaveBeenCalledWith(TldrPanelStorageKeys.languages, sortedLanguages);
        });
    });

    describe('setDefaultLanguage', () => {
        it('will update the global config when called', () => {
            expect(mockConfiguration.get(TldrPanelConfigKeys.defaultLanguage)).toBe(undefined);

            const newLang = 'pt_BR'
            memory.setDefaultLanguage(newLang);

            expect(mockConfiguration.update).toHaveBeenCalledWith(TldrPanelConfigKeys.defaultLanguage, newLang, true);
            expect(mockConfiguration.get(TldrPanelConfigKeys.defaultLanguage)).toBe(newLang);
        });
    });

    describe('setDefaultPlatform', () => {
        it('will update the global config when called', () => {
            expect(mockConfiguration.get(TldrPanelConfigKeys.defaultPlatform)).toBe(undefined);

            const newPlatform = 'android';
            memory.setPlatformOverride(newPlatform);

            expect(mockConfiguration.update).toHaveBeenCalledWith(TldrPanelConfigKeys.defaultPlatform, newPlatform, true);
            expect(mockConfiguration.get(TldrPanelConfigKeys.defaultPlatform)).toBe(newPlatform);
        });
    });
});
