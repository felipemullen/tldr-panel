import { ProgressLocation, ProgressOptions, ProviderResult, TextDocumentContentProvider, Uri, window } from 'vscode';
import { TldrGithub } from './tldr-github';

/**
 * A document provider that allows opening a resource uri with in the format `TLDR:<command>` as a virtual document.
 * This is used in [extension.ts](../extension.ts) to open markdown previews using the results of TLDR pages
 *
 * @example
    workspace.registerTextDocumentContentProvider(TldrDocumentProvider.Scheme, new TldrDocumentProvider(tldrInstance))
 */
export class TldrDocumentProvider implements TextDocumentContentProvider {
    public static Scheme = 'TLDR';

    private _tldr: TldrGithub;

    constructor(tldr: TldrGithub) {
        this._tldr = tldr;
    }

    provideTextDocumentContent(uri: Uri): ProviderResult<string> {
        const command = uri.path;

        const getCommandOptions: ProgressOptions = {
            location: ProgressLocation.Notification,
            title: 'TLDR Panel: Getting TLDR page',
            cancellable: false
        };

        return window.withProgress<string>(getCommandOptions, progress => this._tldr.getCommandInfo(progress, command))
    }
};