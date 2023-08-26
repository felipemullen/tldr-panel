import { _resetWorkspace, mockConfiguration, mockGlobalState, window } from '../../__mocks__/vscode';
import mockFetch from '../../__mocks__/node-fetch';
import { Memory, TldrPanelConfigKeys, TldrPanelStorageKeys } from '../../src/lib/memory';
import { TldrGithub } from '../../src/lib/tldr-github';
import { TldrCommandMap } from '../../src/model/tldr-panel.model';
import { GithubContentsItem, GithubTreeResponse } from '../../src/model/github.model';

describe('TldrDocumentProvider', () => {
    let githubData: GithubTreeResponse;
    let mockProgress: any = {
        report: jest.fn()
    };
    let memory: Memory;
    let tldr: TldrGithub;

    const pages: TldrCommandMap = {
        'git': {
            command: 'git',
            entries: {
                'en': {
                    'android': {
                        url: 'git:en:android'
                    }
                }
            }
        }
    };

    beforeAll(() => {
        githubData = require('../data/github-tree-response.json');
    });

    beforeEach(() => {
        memory = new Memory(mockGlobalState);
        tldr = new TldrGithub(memory);

        memory.updateCache(pages, ['en']);
    });

    afterEach(() => {
        _resetWorkspace();
        jest.clearAllMocks();
    });

    describe('getCommandInfo', () => {
        it('will show an error if command is empty string', async () => {
            const result = await tldr.getCommandInfo(mockProgress, '');

            expect(result).toContain('does not exist');
            expect(mockProgress.report).toHaveBeenCalledWith(expect.objectContaining({ increment: 100 }));
            expect(window.showErrorMessage).toHaveBeenCalledTimes(1);
            expect(window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('does not exist'));
        });

        it('will show an error if command is undefined', async () => {
            // @ts-ignore
            const result = await tldr.getCommandInfo(mockProgress, undefined);

            expect(result).toContain('does not exist');
            expect(mockProgress.report).toHaveBeenCalledWith(expect.objectContaining({ increment: 100 }));
            expect(window.showErrorMessage).toHaveBeenCalledTimes(1);
            expect(window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('does not exist'));
        });

        it('will return error string if command is not in map', async () => {
            const result = await tldr.getCommandInfo(mockProgress, 'cat');
            expect(result).toContain('Command does not exist');
        });

        it('will return error string if command is somehow never found', async () => {
            mockConfiguration.update(TldrPanelConfigKeys.defaultPlatform, 'PLATFORM');
            memory.updateCache({
                git: {
                    entries: {
                        en: {
                            PLATFORM: undefined
                        }
                    }
                }
            } as any, []);

            const result = await tldr.getCommandInfo(mockProgress, 'git');
            expect(result).toContain('Unable to load page');
        });

        it('will fall back to "common" platform if default is not found', async () => {
            mockConfiguration.update(TldrPanelConfigKeys.defaultPlatform, 'PLATFORM');
            const markdownContents = 'a markdown page';
            const mockPages = {
                git: {
                    command: 'git',
                    entries: {
                        en: {
                            common: {
                                url: 'a valid url'
                            }
                        }
                    }
                }
            };
            memory.updateCache(mockPages, []);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue(markdownContents)
            });

            const result = await tldr.getCommandInfo(mockProgress, 'git');
            expect(mockProgress.report).toHaveBeenCalledTimes(3);
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(mockPages.git.entries.en.common.url);
            expect(result).toBe(markdownContents);
        });

        it('will return error with status code if api returns a bad response', async () => {
            mockConfiguration.update(TldrPanelConfigKeys.defaultPlatform, 'PLATFORM');

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            const result = await tldr.getCommandInfo(mockProgress, 'git');

            expect(result).toContain('500');
            expect(result).toContain('Unable to retrieve document');
            expect(mockProgress.report).toHaveBeenCalledTimes(3);
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(pages?.git?.entries?.en?.android?.url);
        });
    });

    describe('cacheCommands', () => {
        it('will not try to refetch if there are commands and the cache is not expired', async () => {
            expect(memory.commandList.length).toBeTruthy();
            await tldr.cacheCommands(mockProgress);
            expect(mockProgress.report).toHaveBeenCalledTimes(1);
            expect(mockProgress.report).toHaveBeenCalledWith(expect.objectContaining({ increment: 100 }));
        });

        it('will show an error and not cache any commands if github response is not ok', async () => {
            (mockGlobalState.update as jest.Mock).mockClear();
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 409
            });
            await tldr.cacheCommands(mockProgress, true);

            expect(window.showErrorMessage).toHaveBeenCalledTimes(1);
            expect(window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('code 409'));

            expect(mockGlobalState.update).not.toHaveBeenCalled();
        });

        it('will show an error message if any throw happens', async () => {
            (mockGlobalState.update as jest.Mock).mockClear();
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockRejectedValueOnce('error')
            });
            await tldr.cacheCommands(mockProgress, true);

            expect(window.showErrorMessage).toHaveBeenCalledTimes(1);
            expect(window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('unable to cache commands'));

            expect(mockGlobalState.update).not.toHaveBeenCalled();
        });

        it('will refetch even if cache valid but forcedUpdate is set', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(githubData)
            });

            expect(memory.commandList.length).toBeTruthy();
            await tldr.cacheCommands(mockProgress, true);

            expect(mockProgress.report).toHaveBeenCalled();
            expect(mockGlobalState.update).toHaveBeenCalled();
        });
    });

    describe('_mapGithubTreeData', () => {
        it('can parse github data properly', async () => {
            (mockGlobalState.update as jest.Mock).mockClear;

            const data: GithubContentsItem[] = [
                {
                    "path": ".editorconfig",
                    "type": "blob",
                    "url": "https://api.github.com/repos/tldr-pages/tldr/git/blobs/717417f0d50dafd8ebe6ca44aa1a6de570aa4a92"
                },
                {
                    "path": "paigeges/common/ansible-playbook.md",
                    "type": "blob",
                    "url": "this path is not valid and should not be parsed"
                },
                {
                    "path": "pages.de/common/ansible-playbook.md",
                    "type": "blob",
                    "url": "https://api.github.com/repos/tldr-pages/tldr/git/blobs/f705c74df68baff9c96cbe1697d59415d4c03135"
                },
                {
                    "path": "pages/linux/qm-move-disk.md",
                    "type": "blob",
                    "url": "https://api.github.com/repos/tldr-pages/tldr/git/blobs/bf96e9e9a4e4773d7efa296cb2a0fd340d4bc3eb"
                },
                {
                    "path": "pages.es/common/[[.md",
                    "type": "blob",
                    "url": "https://api.github.com/repos/tldr-pages/tldr/git/blobs/575a6f18c3a0ae0b475e944a5561fe88e777f7ac"
                }
            ];

            tldr['_mapGithubTreeData'](data, mockProgress);

            const expectedLanguages = ['de', 'es', 'en'];
            expect(mockGlobalState.update).toHaveBeenCalledWith(TldrPanelStorageKeys.languages, expect.arrayContaining(expectedLanguages));

            const expectedMap: TldrCommandMap = {
                '[[': {
                    command: '[[',
                    entries: {
                        'es': {
                            'common': {
                                url: 'https://raw.githubusercontent.com/tldr-pages/tldr/main/pages.es/common/[[.md'
                            }
                        }
                    }
                },
                'ansible-playbook': {
                    command: 'ansible-playbook',
                    entries: {
                        'de': {
                            'common': {
                                url: 'https://raw.githubusercontent.com/tldr-pages/tldr/main/pages.de/common/ansible-playbook.md'
                            }
                        }
                    }
                },
                'qm-move-disk': {
                    command: 'qm-move-disk',
                    entries: {
                        'en': {
                            'linux': {
                                url: 'https://raw.githubusercontent.com/tldr-pages/tldr/main/pages/linux/qm-move-disk.md'
                            }
                        }
                    }
                }
            };
            expect(mockGlobalState.update).toHaveBeenCalledWith(TldrPanelStorageKeys.cachedPages, expectedMap);
        });

        it('will show an error message if there are no pages after parsing github data', async () => {
            const data: GithubContentsItem[] = [];

            tldr['_mapGithubTreeData'](data, mockProgress);

            expect(window.showErrorMessage).toHaveBeenCalledTimes(1);
            expect(window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('unable to cache commands'));
        });
    });
});