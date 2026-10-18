import { tools } from "../../plugin/tool-definitions";
import { authorizedOwner, database, dispatch } from "../../lib/store";
import { DiaryError } from "../../lib/input";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  let id: unknown = null;
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const text = await request.text();
    if (text.length > 180000) throw new DiaryError("too_large", "Request too large", 413);
    const rpc = JSON.parse(text);
    id = rpc.id ?? null;
    if (rpc.jsonrpc !== "2.0") throw new Error("Invalid JSON-RPC");
    if (rpc.method === "server/discover") return Response.json({jsonrpc:"2.0",id,result:{supportedVersions:["2026-07-28"],capabilities:{tools:{}}}}, {headers});
    if (rpc.method === "tools/list") return Response.json({jsonrpc:"2.0",id,result:{tools}}, {headers});
    if (rpc.method !== "tools/call") return Response.json({jsonrpc:"2.0",id,error:{code:-32601,message:"Method not found"}}, {headers});
    try {
      authorizedOwner(request);
      // Browser-only actions such as draft deletion must not become hidden MCP tools.
      if (!tools.some(tool => tool.name === rpc.params?.name))
        throw new DiaryError("not_found","Unknown MCP tool",404);
      const result = await dispatch(database(), rpc.params?.name, rpc.params?.arguments ?? {});
      if (rpc.params?.name === "list_entries") {
        // Owner-only read diagnostic. Invoke this runtime's exact tools/list
        // handler in process, without network access, credentials, or writes.
        const probe = await POST(new Request(request.url, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: "owner-diagnostic", method: "tools/list" })
        }));
        const observed = await probe.json() as { result?: { tools: unknown[] } };
        Object.assign(result, { mcp_diagnostics: {
          probe: "same-runtime-tools-list-v1", tools_list: observed.result
        }});
      }
      return Response.json({jsonrpc:"2.0",id,result:{content:[{type:"text",text:JSON.stringify(result)}]}}, {headers});
    } catch (error) {
      const message = error instanceof DiaryError ? error.message : "Operation failed";
      return Response.json({jsonrpc:"2.0",id,result:{isError:true,content:[{type:"text",text:message}]}}, {headers});
    }
  } catch (error) {
    const tooLarge = error instanceof DiaryError && error.code === "too_large";
    return Response.json({jsonrpc:"2.0",id,error:{code:-32600,message:tooLarge?"Request too large":"Invalid request"}}, {status:tooLarge?413:400,headers});
  }
}

