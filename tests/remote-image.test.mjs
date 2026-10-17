import test from "node:test";
import assert from "node:assert/strict";
import { configuredImageHosts,validateImageSource,downloadImage } from "../lib/remote-image.ts";
const allow=configuredImageHosts("images.example.com,*.cdn.example.com");
const png=new Uint8Array([137,80,78,71,13,10,26,10]);

test("public HTTPS URLs must use exact approved hosts or approved subdomains",()=>{
 assert.equal(validateImageSource("https://images.example.com/a.png?signature=secret",allow).hostname,"images.example.com");
 assert.equal(validateImageSource("https://a.cdn.example.com/path.png",allow).hostname,"a.cdn.example.com");
 assert.throws(()=>validateImageSource("https://cdn.example.com/path.png",allow),e=>e.status===403);
 for(const input of [
  "http://images.example.com/a.png","https://images.example.com.evil.com/a.png",
  "https://evil.com/a.png","https://images.example.com:444/a.png",
  "https://owner:password@images.example.com/a.png","https://127.0.0.1/a.png",
  "https://localhost/a.png","https://[::1]/a.png","file:///etc/passwd"
 ])assert.throws(()=>validateImageSource(input,allow));
 assert.throws(()=>validateImageSource("https://images.example.com/a.png",[]),e=>e.status===503);
 assert.throws(()=>configuredImageHosts("127.0.0.1"));
});
test("bounded remote image download does not send credentials and checks bytes",async()=>{
 const sent=[];
 const fake=async (url,opts)=>{
  sent.push({url,opts});
  return new Response(png,{headers:{"Content-Type":"image/png","Content-Length":String(png.length)}});
 };
 const result=await downloadImage("https://images.example.com/a.png",allow,fake);
 assert.equal(result.image.type,"image/png");
 assert.equal(result.image.size,8);
 assert.equal(result.final_host,"images.example.com");
 assert.equal(sent[0].opts.redirect,"manual");
 assert.equal(sent[0].opts.credentials,"omit");
 assert.equal(sent[0].opts.referrerPolicy,"no-referrer");
 assert.ok(!Object.keys(sent[0].opts.headers).some(h=>/authorization|cookie/i.test(h)));
});
test("redirects are separately allowlisted and bounded",async()=>{
 await assert.rejects(
   downloadImage("https://images.example.com/a",allow,async()=>
    new Response(null,{status:302,headers:{Location:"https://127.0.0.1/secrets"}})),
   e=>e.status===400
 );
 let count=0;
 const followed=await downloadImage("https://images.example.com/a",allow,async()=>{
  count++;
  if(count===1)return new Response(null,{status:302,headers:{Location:"https://a.cdn.example.com/b"}});
  return new Response(png,{headers:{"Content-Type":"image/png"}});
 });
 assert.equal(followed.final_host,"a.cdn.example.com");
 assert.equal(count,2);
 await assert.rejects(
   downloadImage("https://images.example.com/a",allow,async()=>
    new Response(null,{status:301,headers:{Location:"/next"}})),
   e=>e.code==="too_many_redirects"
 );
});
test("non-image, mismatched magic bytes and oversized responses are rejected",async()=>{
 await assert.rejects(downloadImage("https://images.example.com/a",allow,async()=>
    new Response("<html>x</html>",{headers:{"Content-Type":"text/html"}})),
   e=>e.status===415);
 await assert.rejects(downloadImage("https://images.example.com/a",allow,async()=>
    new Response("<html>x</html>",{headers:{"Content-Type":"image/png"}})),
   e=>e.status===415);
 await assert.rejects(downloadImage("https://images.example.com/a",allow,async()=>
    new Response(png,{headers:{"Content-Type":"image/png","Content-Length":"10485761"}})),
   e=>e.status===413);
 await assert.rejects(downloadImage("https://images.example.com/a",allow,async()=>
    new Response(new Uint8Array(10485761),{headers:{"Content-Type":"image/png"}})),
   e=>e.status===413);
});
