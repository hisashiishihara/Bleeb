import test from "node:test";
import assert from "node:assert/strict";
import { chatGPTFileHosts, parseChatGPTFile, downloadChatGPTImage } from "../lib/chatgpt-file.ts";

const bytes=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
const file=(url="https://files.oaiusercontent.com/temp/test.png?X-Amz-Signature=secret")=>({
  download_url:url,file_id:"file_test-abc",mime_type:"image/png",file_name:"画像.png"
});

test("ChatGPT native fileParam has required four-field shape and strict host defaults",()=>{
 assert.deepEqual(parseChatGPTFile(file()).file_id,"file_test-abc");
 assert.ok(chatGPTFileHosts().includes("files.oaiusercontent.com"));
 for(const invalid of ["sandbox:/mnt/data/image.png",undefined,null,"file_test",{download_url:"https://files.oaiusercontent.com/test.png"}])
  assert.throws(()=>parseChatGPTFile(invalid),{code:"invalid_file"});
 assert.equal(parseChatGPTFile({...file(),mime_type:"application/octet-stream"}).mime_type,"application/octet-stream");
 assert.throws(()=>parseChatGPTFile({...file(),mime_type:"text/html"}),{code:"invalid_media"});
 assert.throws(()=>parseChatGPTFile({...file(),file_name:""}),{code:"invalid_file"});
});

test("download generated PNG over signed HTTPS URL with octet-stream and no forwarded credentials",async()=>{
 const seen=[];
 const result=await downloadChatGPTImage(file(),undefined,async(url,options)=>{
  seen.push({url,options});
  return new Response(bytes,{headers:{"Content-Type":"application/octet-stream"}});
 });
 assert.equal(result.name,"画像.png");
 assert.equal(result.type,"image/png");
 assert.deepEqual(new Uint8Array(await result.arrayBuffer()),bytes);
 assert.equal(seen.length,1);
 assert.equal(seen[0].options.credentials,"omit");
 assert.equal(seen[0].options.referrerPolicy,"no-referrer");
 assert.equal(seen[0].options.redirect,"manual");
 assert.ok(seen[0].options.signal);
});
test("native transfer fails before fetch for sandbox paths, public attacker URL and insecure URLs",async()=>{
 let calls=0;
 const fetcher=async()=>{calls++;return new Response(bytes,{headers:{"Content-Type":"image/png"}})};
 const urls=["sandbox:/mnt/data/cover.png","https://127.0.0.1/file.png","http://files.oaiusercontent.com/x.png",
  "https://evil.example.com/x.png","https://files.oaiusercontent.com.evil.example/x.png"];
 for(const url of urls)
  await assert.rejects(downloadChatGPTImage(file(url),undefined,fetcher));
 assert.equal(calls,0);
});
test("redirects to untrusted domains and wrong signatures are rejected",async()=>{
 let calls=0;
 await assert.rejects(downloadChatGPTImage(file(),undefined,async()=>{
  calls++;return new Response(null,{status:302,headers:{location:"https://evil.example.com/secret.png"}});
 }),{code:"image_host_not_allowed"});
 assert.equal(calls,1);
 await assert.rejects(downloadChatGPTImage(file(),undefined,async()=>new Response(new Uint8Array([1,2,3,4]),{
  headers:{"Content-Type":"application/octet-stream"}
 })),{code:"invalid_media"});
 await assert.rejects(downloadChatGPTImage(file(),undefined,async()=>new Response(bytes,{
  headers:{"Content-Type":"image/jpeg"}
 })),{code:"invalid_media"});
});

test("ChatGPT fileParams supplies octet-stream MIME for genuine generated PNG",async()=>{
 const genericFile={...file(),mime_type:"application/octet-stream"};
 const result=await downloadChatGPTImage(genericFile,undefined,
  async()=>new Response(bytes,{headers:{"Content-Type":"application/octet-stream"}}));
 assert.equal(result.type,"image/png");
 assert.deepEqual(new Uint8Array(await result.arrayBuffer()),bytes);
 const headerless=await downloadChatGPTImage(genericFile,undefined,
  async()=>new Response(bytes,{headers:{}}));
 assert.equal(headerless.type,"image/png");
 const noHint=await downloadChatGPTImage({...file(),mime_type:undefined},undefined,
  async()=>new Response(bytes,{headers:{"Content-Type":"application/octet-stream"}}));
 assert.equal(noHint.type,"image/png");
});

test("octet-stream fileParams rejects nonimages and mismatched declared MIME",async()=>{
 const genericFile={...file(),mime_type:"application/octet-stream"};
 await assert.rejects(downloadChatGPTImage(genericFile,undefined,
  async()=>new Response(new TextEncoder().encode("<html>not a PNG</html>"),{headers:{"Content-Type":"application/octet-stream"}})),{code:"invalid_media"});
 await assert.rejects(downloadChatGPTImage(genericFile,undefined,
  async()=>new Response(bytes,{headers:{"Content-Type":"text/html"}})),{code:"invalid_media"});
 await assert.rejects(downloadChatGPTImage({...file(),mime_type:"image/jpeg"},undefined,
  async()=>new Response(bytes,{headers:{"Content-Type":"application/octet-stream"}})),{code:"invalid_media"});
});
