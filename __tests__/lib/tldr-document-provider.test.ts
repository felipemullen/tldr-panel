import { TldrDocumentProvider } from '../../src/lib/tldr-document-provider';

describe('TldrDocumentProvider', () => {
    let docProvider: TldrDocumentProvider;
    let mockTldrGithub: any;

    beforeEach(() => {
        mockTldrGithub = {
            getCommandInfo: jest.fn()
        } as any;
        docProvider = new TldrDocumentProvider(mockTldrGithub);
    });

    afterEach(() => {
        mockTldrGithub.getCommandInfo.mockClear();
    });

    describe('provideTextDocumentContent', () => {
        it('calls tldr with a progress window', async () => {
            const command = 'git';
            const uri = {
                path: command
            } as any;

            await docProvider.provideTextDocumentContent(uri);
            expect(mockTldrGithub.getCommandInfo).toHaveBeenCalledTimes(1);
            expect(mockTldrGithub.getCommandInfo).toHaveBeenCalledWith(expect.anything(), command);
        });
    });
});