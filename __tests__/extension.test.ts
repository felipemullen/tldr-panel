import { activate, deactivate } from '../src/extension';
import { ViewColumn, commands, mockGlobalState, window } from '../__mocks__/vscode';
import { ExtensionContext } from 'vscode';
import { TLDR_PLATFORMS } from '../src/model/tldr-panel.model';
import { Memory } from '../src/lib/memory';
import { TldrGithub } from '../src/lib/tldr-github';

describe('TLDR Panel tests', () => {
    let context: ExtensionContext;

    beforeEach(() => {
        context = {
            globalState: mockGlobalState,
            subscriptions: {
                push: jest.fn()
            }
        } as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('extension will activate', async () => {
        activate(context);
        expect(context.subscriptions.push).toHaveBeenCalledTimes(5);
    });

    it('extension will deactivate', async () => {
        deactivate();
    });

    it('will register tldr-panel.refreshCache', async () => {
        // (context.subscriptions.push as jest.Mock).mockImplementationOnce(() => { });

        const cacheCommandsSpy = jest.spyOn(TldrGithub.prototype, 'cacheCommands');

        commands.registerCommand.mockImplementationOnce(async (_command: string, callback: () => Promise<void>) => {
            await callback();
        });

        activate(context);

        await new Promise(process.nextTick);

        expect(commands.registerCommand).toHaveBeenCalledWith('tldr-panel.refreshCache', expect.anything());
        expect(window.withProgress).toHaveBeenCalledTimes(1);
        expect(window.withProgress).toHaveBeenCalledWith(expect.objectContaining({
            title: 'TLDR Panel: Caching TLDR data'
        }), expect.anything());

        expect(cacheCommandsSpy).toHaveBeenCalledTimes(1);
    });

    it('will register tldr-panel.showTldrPage', async () => {
        const cacheIsExpiredSpy = jest.spyOn(Memory.prototype, 'cacheIsExpired', 'get').mockReturnValueOnce(false);
        window.showQuickPick.mockResolvedValueOnce('my-cmd');

        jest.spyOn(Memory.prototype, 'panelPosition', 'get').mockReturnValueOnce(ViewColumn.Active);

        commands.registerCommand.mockImplementationOnce(() => { });
        commands.registerCommand.mockImplementationOnce(async (_command: string, callback: () => Promise<void>) => {
            await callback();
        });

        activate(context);

        await new Promise(process.nextTick);

        expect(cacheIsExpiredSpy).toHaveBeenCalledTimes(1);
        expect(window.showQuickPick).toHaveBeenCalledTimes(1);
        expect(commands.executeCommand).toHaveBeenCalledTimes(1);
        expect(commands.executeCommand).toHaveBeenCalledWith('markdown.showPreview', 'TLDR:my-cmd');
    });

    it('will open command panel to the side based on configuration value', async () => {
        const cacheIsExpiredSpy = jest.spyOn(Memory.prototype, 'cacheIsExpired', 'get').mockReturnValueOnce(false);
        window.showQuickPick.mockResolvedValueOnce('my-cmd');

        jest.spyOn(Memory.prototype, 'panelPosition', 'get').mockReturnValueOnce(ViewColumn.Beside);

        commands.registerCommand.mockImplementationOnce(() => { });
        commands.registerCommand.mockImplementationOnce(async (_command: string, callback: () => Promise<void>) => {
            await callback();
        });

        activate(context);

        await new Promise(process.nextTick);

        expect(cacheIsExpiredSpy).toHaveBeenCalledTimes(1);
        expect(window.showQuickPick).toHaveBeenCalledTimes(1);
        expect(commands.executeCommand).toHaveBeenCalledTimes(1);
        expect(commands.executeCommand).toHaveBeenCalledWith('markdown.showPreviewToSide', 'TLDR:my-cmd');
    });

    it('will cache commands if necessary before showing command choices', async () => {
        const cacheIsExpiredSpy = jest.spyOn(Memory.prototype, 'cacheIsExpired', 'get').mockReturnValueOnce(true);
        window.showQuickPick.mockResolvedValueOnce('');

        commands.registerCommand.mockImplementationOnce(() => { });
        commands.registerCommand.mockImplementationOnce(async (_command: string, callback: () => Promise<void>) => {
            await callback();
        });

        activate(context);

        await new Promise(process.nextTick);

        expect(cacheIsExpiredSpy).toHaveBeenCalledTimes(1);
        expect(window.showQuickPick).toHaveBeenCalledTimes(1);
        expect(window.withProgress).toHaveBeenCalledTimes(1);
        // Not expecting this call because of the empty return from window.showQuickPick above
        expect(commands.executeCommand).not.toHaveBeenCalled();
    });

    it('will register tldr-panel.chooseLanguage', async () => {
        const setLanguageSpy = jest.spyOn(Memory.prototype, 'setDefaultLanguage');
        const cacheIsExpiredSpy = jest.spyOn(Memory.prototype, 'cacheIsExpired', 'get').mockReturnValueOnce(false);

        commands.registerCommand.mockImplementationOnce(() => { });
        commands.registerCommand.mockImplementationOnce(() => { });
        commands.registerCommand.mockImplementationOnce(async (_command: string, callback: () => Promise<void>) => {
            await callback();
        });

        activate(context);

        await new Promise(process.nextTick);

        expect(cacheIsExpiredSpy).toHaveBeenCalledTimes(1);
        expect(window.showQuickPick).toHaveBeenCalledTimes(1);
        expect(window.showQuickPick).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            placeHolder: expect.stringContaining('')
        }));

        expect(setLanguageSpy).toHaveBeenCalledTimes(1);
    });

    it('will cache commands if there are no languages', async () => {
        const setLanguageSpy = jest.spyOn(Memory.prototype, 'setDefaultLanguage');
        const cacheIsExpiredSpy = jest.spyOn(Memory.prototype, 'cacheIsExpired', 'get').mockReturnValueOnce(true);
        window.withProgress.mockResolvedValueOnce({});

        commands.registerCommand.mockImplementationOnce(() => { });
        commands.registerCommand.mockImplementationOnce(() => { });
        commands.registerCommand.mockImplementationOnce(async (_command: string, callback: () => Promise<void>) => {
            await callback();
        });

        activate(context);

        await new Promise(process.nextTick);

        expect(cacheIsExpiredSpy).toHaveBeenCalledTimes(1);
        expect(window.withProgress).toHaveBeenCalledTimes(1);
        expect(window.showQuickPick).toHaveBeenCalledTimes(1);
        expect(window.showQuickPick).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            placeHolder: expect.stringContaining('')
        }));

        expect(setLanguageSpy).toHaveBeenCalledTimes(1);
    });

    it('will register tldr-panel.setPlatform', async () => {
        const setPlatformSpy = jest.spyOn(Memory.prototype, 'setPlatformOverride');

        commands.registerCommand.mockImplementationOnce(() => { });
        commands.registerCommand.mockImplementationOnce(() => { });
        commands.registerCommand.mockImplementationOnce(() => { });
        commands.registerCommand.mockImplementationOnce(async (_command: string, callback: () => Promise<void>) => {
            await callback();
        });

        activate(context);

        await new Promise(process.nextTick);

        expect(window.showQuickPick).toHaveBeenCalledTimes(1);
        expect(window.showQuickPick).toHaveBeenCalledWith(TLDR_PLATFORMS, expect.objectContaining({
            placeHolder: expect.anything()
        }));

        expect(setPlatformSpy).toHaveBeenCalledTimes(1);
    });
});
