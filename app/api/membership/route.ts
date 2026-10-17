export const dynamic="force-dynamic";
// Membership and billing are suspended; preserve stored data without writes.
export async function POST(){ return new Response(null,{status:404,headers:{"Cache-Control":"private, no-store"}}); }
