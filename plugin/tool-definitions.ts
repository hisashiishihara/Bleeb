// Describes the intended Site-hosted MCP surface. Actual Site MCP registration
// and trusted caller identity must be proven before enabling external tools.
const object = (properties: Record<string,unknown>, required: string[] = []) =>
  ({ type: "object", properties, required, additionalProperties: false });
const string = { type: "string" };
const draft = { title:string, body_md:string, summary:string, tags:{type:"array",items:string,maxItems:20}, request_id:string };
export const tools = [
  { name:"save_draft", description:"Save a private article draft; never publishes", inputSchema: object(draft,["title","body_md","request_id"]) },
  { name:"list_entries", description:"List only entries authorized for the owner", inputSchema:object({ status:{type:"string",enum:["all","draft","published"]}, limit:{type:"integer",minimum:1,maximum:100} }) },
  { name:"get_entry", description:"Read an owner's entry and chosen revision", inputSchema:object({entry_id:string,revision:{type:"integer",minimum:1}},["entry_id"]) },
  { name:"update_entry", description:"Append a private revision with an optimistic lock", inputSchema:object({...draft,entry_id:string,expected_revision:{type:"integer",minimum:1}},["entry_id","expected_revision","title","body_md","request_id"]) },
  { name:"publish_entry", description:"Publish a saved revision only on explicit owner instruction. Specify visibility owner or public; never infer a broader audience from ambiguous instructions. Omission preserves the current audience (owner by default).", inputSchema:object({entry_id:string,revision:{type:"integer",minimum:1},visibility:{type:"string",enum:["owner","public"]},request_id:string},["entry_id","revision","request_id"]) },
  { name:"unpublish_entry", description:"Withdraw a published entry by explicit request", inputSchema:object({entry_id:string,request_id:string},["entry_id","request_id"]) },
  { name:"export_entries", description:"Owner-only portable Markdown and metadata export", inputSchema:object({entry_ids:{type:"array",items:string,maxItems:100},include_drafts:{type:"boolean"}}) },
  { name:"delete_media", description:"Irreversibly delete a specific owner-uploaded image or video from private R2 and its D1 index, only on explicit owner request. Cannot delete media used by the active published revision; historical Markdown text is preserved. Supply media_id and optionally the containing entry_id.", inputSchema:object({media_id:string,entry_id:string},["media_id"]) }
] as const;
