export interface GithubContentsItemLinks {
    self: string;
    git: string;
    html: string;
}

export interface GithubContentsItem {
    name: string;
    path: string;
    url: string;
    type: 'file' | 'folder' | 'blob';
}

export interface GithubTreeResponse {
    sha: string;
    url: string;
    tree: GithubContentsItem[];
}