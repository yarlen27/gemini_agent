import { ITool, ToolContext } from '../../../interfaces/ITool';
import { ToolResult } from '../../../../models/ToolResult';
import { SendPostRequestParams, TestGetEndpointParams, UploadFileParams, DownloadFileParams, SendWebhookParams } from './types/HttpApiTypes';
export declare class SendPostRequestTool implements ITool {
    readonly name = "send_post_request_with_json_body";
    private httpClient;
    constructor();
    execute(params: SendPostRequestParams, context?: ToolContext): Promise<ToolResult>;
}
export declare class TestGetEndpointTool implements ITool {
    readonly name = "test_get_endpoint_response_status";
    private httpClient;
    constructor();
    execute(params: TestGetEndpointParams, context?: ToolContext): Promise<ToolResult>;
}
export declare class UploadFileTool implements ITool {
    readonly name = "upload_file_via_multipart_form";
    private httpClient;
    private fileUploader;
    constructor();
    execute(params: UploadFileParams, context?: ToolContext): Promise<ToolResult>;
}
export declare class DownloadFileTool implements ITool {
    readonly name = "download_file_from_url_to_path";
    private httpClient;
    private fileDownloader;
    constructor();
    execute(params: DownloadFileParams, context?: ToolContext): Promise<ToolResult>;
}
export declare class SendWebhookTool implements ITool {
    readonly name = "send_webhook_payload_to_url";
    private httpClient;
    constructor();
    execute(params: SendWebhookParams, context?: ToolContext): Promise<ToolResult>;
}
//# sourceMappingURL=HttpApiTool.d.ts.map