export interface GithubContentsItemLinks {
    self: string;
    git: string;
    html: string;
}

export interface GithubContentsItem {
    name: string;
    path: string;
    sha: string;
    size: string;
    url: string;
    html_url: string;
    git_url: string;
    download_url: string;
    type: 'file' | 'folder' | 'blob';
    _links: GithubContentsItemLinks
}

export interface GithubTreeResponse {
    sha: string;
    url: string;
    tree: GithubContentsItem[];
}