import test from "node:test";
import assert from "node:assert/strict";
import {parseReferralSource,isSameOriginPost} from "../lib/referrers.ts";

test("referrals retain host only, never searches, query strings or visitor identity",()=>{
  const a=parseReferralSource("https://www.google.com/search?q=personal+secret&utm_source=private","https://ai.example.com/posts/slug");
  assert.deepEqual(a,{host:"www.google.com",origin:"https://www.google.com"});
  assert.equal(JSON.stringify(a).includes("personal"),false);
  assert.equal(parseReferralSource("https://ai.example.com/post","https://ai.example.com/post"),null);
});
test("referrers reject absent/unsafe/intranet or attacker-controlled protocols",()=>{
 for (const source of [null,"","javascript:alert(1)","http://example.org/","https://me:pass@example.org/p","https://localhost/x","invalid"]){
   assert.equal(parseReferralSource(source,"https://ai.example.com/posts/test"),null);
 }
});
test("collector requires a same-origin browser post",()=>{
  assert.equal(isSameOriginPost("https://ai.example.com/api/referrer","https://ai.example.com"),true);
  for(const origin of [null,"https://evil.example.com","https://ai.example.com.evil.com","null","https://ai.example.com/x"]){
    assert.equal(isSameOriginPost("https://ai.example.com/api/referrer",origin),false);
  }
});
