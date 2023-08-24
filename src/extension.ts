import { ExtensionContext, ProgressLocation, ProgressOptions, Uri, commands, window, workspace } from 'vscode';
import { TldrGithub } from './lib/tldr-github';
import { Memory } from './lib/memory';
import { TldrPlatform, TldrPlatforms } from './model/tldr-panel.model';
import { TldrDocumentProvider } from './lib/tldr-document-provider';

const cacheProgressOptions: ProgressOptions = {
    location: ProgressLocation.Notification,
    title: 'TLDR Panel: Caching TLDR data',
    cancellable: false
};

export function activate(context: ExtensionContext) {
    console.log('[tldr-panel] Activating extension');

    const memory = new Memory(context.globalState);
    const tldr = new TldrGithub(memory);

    context.subscriptions.push(workspace.registerTextDocumentContentProvider(TldrDocumentProvider.Scheme, new TldrDocumentProvider(tldr)));

    context.subscriptions.push(commands.registerCommand('tldr-panel.refreshCache', async () => {
        await window.withProgress(cacheProgressOptions, progress => tldr.cacheCommands(progress, true));
    }));

    context.subscriptions.push(commands.registerCommand('tldr-panel.showTldrPage', async () => {
        if (memory.cacheIsExpired) {
            await window.withProgress(cacheProgressOptions, progress => tldr.cacheCommands(progress, true));
        }

        const commandChoice = await window.showQuickPick(memory.commandList, {
            placeHolder: 'Enter a command'
        });

        if (commandChoice) {
            const uri = Uri.parse('TLDR:' + commandChoice);

            // Command implementation: https://github.com/microsoft/vscode/blob/7ee9aa4757212dd513e7cf4b9b67426401e64695/extensions/markdown-language-features/src/commands/showPreview.ts#L79
            await commands.executeCommand("markdown.showPreviewToSide", uri);
        }
    }));


    context.subscriptions.push(commands.registerCommand('tldr-panel.chooseLanguage', async () => {
        if (memory.cacheIsExpired) {
            await window.withProgress(cacheProgressOptions, progress => tldr.cacheCommands(progress, true));
        }

        const languageChoice = await window.showQuickPick(memory.languageList, {
            placeHolder: 'Select default language. Fallback will always be "English"'
        });

        await memory.setDefaultLanguage(languageChoice);
    }));

    context.subscriptions.push(commands.registerCommand('tldr-panel.setPlatform', async () => {
        const platformChoice = await window.showQuickPick(TldrPlatforms, {
            placeHolder: 'Select primary platform for lookup. Fallback will be "Common" or the first platform where the command is available'
        });

        await memory.setPlatformOverride(platformChoice as TldrPlatform);
    }));
}

export function deactivate() {

}