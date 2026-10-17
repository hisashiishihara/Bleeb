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
  { name:"import_media_from_url", description:"Copy a publicly retrievable image from an allowlisted HTTPS URL into private R2. usage=hero creates a new private revision with that image as hero; usage=inline returns Markdown without changing the article. Owner only; never auto-publishes.", inputSchema:object({entry_id:string,expected_revision:{type:"integer",minimum:1},source_url:string,usage:{type:"string",enum:["hero","inline"]},alt_text:string,request_id:string},["entry_id","expected_revision","source_url","usage","request_id"]) },
  { name:"set_entry_hero_media", description:"Select an already uploaded image as article hero; append a private revision with optimistic lock, never auto-publish.", inputSchema:object({entry_id:string,hero_media_id:string,alt_text:string,expected_revision:{type:"integer",minimum:1},request_id:string},["entry_id","hero_media_id","expected_revision","request_id"]) },
  { name:"clear_entry_hero_media", description:"Remove hero from a NEW private article revision; keep media bytes until explicitly deleted.", inputSchema:object({entry_id:string,expected_revision:{type:"integer",minimum:1},request_id:string},["entry_id","expected_revision","request_id"]) },
  { name:"delete_media", description:"Irreversibly delete a specific owner-uploaded image or video from private R2 and its D1 index, only on explicit owner request. Cannot delete media used by the active published revision; historical Markdown text is preserved. Supply media_id and optionally the containing entry_id.", inputSchema:object({media_id:string,entry_id:string},["media_id"]) }
] as const;
