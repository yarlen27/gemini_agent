export interface CopyFileParams {
    source_path: string;
    target_directory: string;
    overwrite?: boolean;
    preserve_permissions?: boolean;
}

export interface RenameFileParams {
    file_path: string;
    pattern: string;
    replacement: string;
    backup_original?: boolean;
}

export interface DeleteFilesByExtensionParams {
    directory: string;
    extension: string;
    recursive?: boolean;
    dry_run?: boolean;
    confirm_deletion: boolean;
}

export interface CreateDirectoryStructureParams {
    base_path: string;
    structure: string[] | DirectoryTree;
    create_gitkeep?: boolean;
}

export interface SearchTextInFilesParams {
    directory: string;
    search_pattern: string;
    file_extensions?: string[];
    recursive?: boolean;
    case_sensitive?: boolean;
    max_results?: number;
}

export interface DirectoryTree {
    [key: string]: string | DirectoryTree;
}

export interface SearchResult {
    file_path: string;
    line_number: number;
    line_content: string;
    match: string;
}

export interface DeletePreviewResult {
    files_to_delete: string[];
    total_count: number;
}

export interface CreateDirectoryResult {
    created_directories: string[];
    total_count: number;
}