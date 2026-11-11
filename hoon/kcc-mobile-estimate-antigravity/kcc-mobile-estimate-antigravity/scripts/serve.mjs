import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {dirname,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../web');
const port=Number(process.env.PORT||4173);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be between 1 and 65535');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end('Method not allowed');return;}
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(path.includes('\0'))throw new URIError('Invalid path');
  let file=resolve(root,'.'+path);
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
  if((await stat(file)).isDirectory())file=resolve(file,'index.html');
  const data=await readFile(file);
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:data);
 }catch(error){res.writeHead(error instanceof URIError?400:404,{'Content-Type':'text/plain; charset=utf-8'});res.end(error instanceof URIError?'Bad request':'Not found');}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is busy. Set PORT to another port.`:error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{
 console.log(`KCC 견적서: http://localhost:${port}/`);
 console.log(`모바일 미리보기: http://localhost:${port}/mobile.html`);
 console.log('종료: Ctrl+C · 개발 서버이며 실제 상담 접수는 연결되어 있지 않습니다.');
});
