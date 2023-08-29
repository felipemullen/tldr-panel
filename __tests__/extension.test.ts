import { TldrCommands, activate, deactivate } from '../src/extension';
import { ViewColumn, commands, mockGlobalState, window } from '../__mocks__/vscode';
import { ExtensionContext } from 'vscode';
import { TLDR_PLATFORMS } from '../src/model/tldr-panel.model';
import { Memory } from '../src/lib/memory';
import { TldrGithub } from '../src/lib/tldr-github';

describe('TLDR Panel tests', () => {
    let context: ExtensionContext;

    /**
     * This function is used in place of {@link activate} because the mocks do not allow
     * waiting with await. Perhaps there is an elegant solution to the problem, but most
     * of the expect statements in this test suite need to wait at least one promise to
     * tick before they will pass
     */
    async function activateAndWait() {
        activate(context);
        await new Promise(process.nextTick);
        await new Promise(process.nextTick);
    }

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
        await activateAndWait();
        expect(context.subscriptions.push).toHaveBeenCalledTimes(5);
    });

    it('extension will deactivate', async () => {
        deactivate();
    });

    it(`will register ${TldrCommands.refreshCache}`, async () => {
        // (context.subscriptions.push as jest.Mock).mockImplementationOnce(() => { });

        const cacheCommandsSpy = jest.spyOn(TldrGithub.prototype, 'cacheCommands');

        commands.registerCommand.mockImplementationOnce(async (_command: string, callback: () => Promise<void>) => {
            await callback();
        });

        await activateAndWait();

        expect(commands.registerCommand).toHaveBeenCalledWith(TldrCommands.refreshCache, expect.anything());
        expect(window.withProgress).toHaveBeenCalledTimes(1);
        expect(window.withProgress).toHaveBeenCalledWith(expect.objectContaining({
            title: 'TLDR Panel: Caching TLDR data'
        }), expect.anything());

        expect(cacheCommandsSpy).toHaveBeenCalledTimes(1);
    });

    it(`will register ${TldrCommands.showPage}`, async () => {
        const cacheIsExpiredSpy = jest.spyOn(Memory.prototype, 'cacheIsExpired', 'get').mockReturnValueOnce(false);
        window.showQuickPick.mockResolvedValueOnce('my-cmd');

        jest.spyOn(Memory.prototype, 'panelPosition', 'get').mockReturnValueOnce(ViewColumn.Active);

        commands.registerCommand.mockImplementationOnce(() => { });
        commands.registerCommand.mockImplementationOnce(async (_command: string, callback: () => Promise<void>) => {
            await callback();
        });

        await activateAndWait();

        expect(cacheIsExpiredSpy).toHaveBeenCalledTimes(1);
        expect(window.showQuickPick).toHaveBeenCalledTimes(1);
        expect(commands.executeCommand).toHaveBeenCalledTimes(1);
        expect(commands.executeCommand).toHaveBeenCalledWith('markdown.showPreview', expect.stringContaining('TLDR:my-cmd'));
    });

    it('will open command panel to the side based on configuration value', async () => {
        const cacheIsExpiredSpy = jest.spyOn(Memory.prototype, 'cacheIsExpired', 'get').mockReturnValueOnce(false);
        window.showQuickPick.mockResolvedValueOnce('my-cmd');

        jest.spyOn(Memory.prototype, 'panelPosition', 'get').mockReturnValueOnce(ViewColumn.Beside);

        commands.registerCommand.mockImplementationOnce(() => { });
        commands.registerCommand.mockImplementationOnce(async (_command: string, callback: () => Promise<void>) => {
            await callback();
        });

        await activateAndWait();

        expect(cacheIsExpiredSpy).toHaveBeenCalledTimes(1);
        expect(window.showQuickPick).toHaveBeenCalledTimes(1);
        expect(commands.executeCommand).toHaveBeenCalledTimes(1);
        expect(commands.executeCommand).toHaveBeenCalledWith('markdown.showPreviewToSide', expect.stringContaining('TLDR:my-cmd'));
    });

    it('will cache commands if necessary before showing command choices', async () => {
        const cacheIsExpiredSpy = jest.spyOn(Memory.prototype, 'cacheIsExpired', 'get').mockReturnValueOnce(true);
        window.showQuickPick.mockResolvedValueOnce('');

        commands.registerCommand.mockImplementationOnce(() => { });
        commands.registerCommand.mockImplementationOnce(async (_command: string, callback: () => Promise<void>) => {
            await callback();
        });

        await activateAndWait();

        expect(cacheIsExpiredSpy).toHaveBeenCalledTimes(1);
        expect(window.showQuickPick).toHaveBeenCalledTimes(1);
        expect(window.withProgress).toHaveBeenCalledTimes(1);
        // Not expecting this call because of the empty return from window.showQuickPick above
        expect(commands.executeCommand).not.toHaveBeenCalled();
    });

    it(`will register ${TldrCommands.setLanguage}`, async () => {
        const setLanguageSpy = jest.spyOn(Memory.prototype, 'setDefaultLanguage');
        const cacheIsExpiredSpy = jest.spyOn(Memory.prototype, 'cacheIsExpired', 'get').mockReturnValueOnce(false);

        commands.registerCommand.mockImplementationOnce(() => { });
        commands.registerCommand.mockImplementationOnce(() => { });
        commands.registerCommand.mockImplementationOnce(async (_command: string, callback: () => Promise<void>) => {
            await callback();
        });

        await activateAndWait();

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

        await activateAndWait();

        expect(cacheIsExpiredSpy).toHaveBeenCalledTimes(1);
        expect(window.withProgress).toHaveBeenCalledTimes(1);
        expect(window.showQuickPick).toHaveBeenCalledTimes(1);
        expect(window.showQuickPick).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            placeHolder: expect.stringContaining('')
        }));

        expect(setLanguageSpy).toHaveBeenCalledTimes(1);
    });

    it(`will register ${TldrCommands.setPlatform}`, async () => {
        const setPlatformSpy = jest.spyOn(Memory.prototype, 'setPlatformOverride');

        commands.registerCommand.mockImplementationOnce(() => { });
        commands.registerCommand.mockImplementationOnce(() => { });
        commands.registerCommand.mockImplementationOnce(() => { });
        commands.registerCommand.mockImplementationOnce(async (_command: string, callback: () => Promise<void>) => {
            await callback();
        });

        await activateAndWait();

        expect(window.showQuickPick).toHaveBeenCalledTimes(1);
        expect(window.showQuickPick).toHaveBeenCalledWith(TLDR_PLATFORMS, expect.objectContaining({
            placeHolder: expect.anything()
        }));

        expect(setPlatformSpy).toHaveBeenCalledTimes(1);
    });
});
