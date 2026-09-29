// js/md.js — мінімальний Markdown → HTML (для STATUS.md, reports/*.md, довідки).
// Підтримує: # заголовки, - / * списки, - [ ] / - [x] чекбокси, 1. нумеровані, **жирний**, `код`,
// [текст](url), --- лінія, таблиці | a | b |, ``` блоки коду, порожній рядок = абзац.
function mdInline(s){
  s=esc(s);
  s=s.replace(/`([^`]+)`/g,'<code>$1</code>');
  s=s.replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
  s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|[^)\s]+\.md|#[^)\s]*)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}
function mdToHtml(md){
  const lines=String(md||"").replace(/\r/g,"").split("\n");
  let out=[],list=null,para=[],code=false,table=null;
  const flushPara=()=>{if(para.length){out.push("<p>"+mdInline(para.join(" "))+"</p>");para=[]}};
  const flushList=()=>{if(list){out.push(list.type==="ol"?"</ol>":"</ul>");list=null}};
  const flushTable=()=>{if(table){out.push('<table class="tbl">'+table.rows.map((r,i)=>"<tr>"+r.map(c=>(i===0?"<th>":"<td>")+mdInline(c.trim())+(i===0?"</th>":"</td>")).join("")+"</tr>").join("")+"</table>");table=null}};
  for(let raw of lines){
    if(raw.trim().startsWith("```")){flushPara();flushList();flushTable();if(code){out.push("</pre>");code=false}else{out.push('<pre class="md-code">');code=true}continue}
    if(code){out.push(esc(raw));continue}
    const line=raw.replace(/\s+$/,"");
    if(!line.trim()){flushPara();flushList();flushTable();continue}
    if(/^\s*\|.*\|\s*$/.test(line)){flushPara();flushList();if(/^\s*\|[\s:\-|]+\|\s*$/.test(line))continue;const cells=line.trim().slice(1,-1).split("|");if(!table)table={rows:[]};table.rows.push(cells);continue}
    flushTable();
    const h=line.match(/^(#{1,4})\s+(.*)$/);
    if(h){flushPara();flushList();const l=h[1].length;out.push(`<h${l+1} class="md-h${l}">${mdInline(h[2])}</h${l+1}>`);continue}
    if(/^---+\s*$/.test(line)){flushPara();flushList();out.push('<hr class="md-hr">');continue}
    const li=line.match(/^\s*[-*]\s+(.*)$/);const oli=line.match(/^\s*\d+[.)]\s+(.*)$/);
    if(li||oli){flushPara();const type=oli?"ol":"ul";if(!list||list.type!==type){flushList();list={type};out.push(type==="ol"?'<ol class="md-list">':'<ul class="md-list">')}
      let txt=(li||oli)[1];let cb="";
      const m=txt.match(/^\[( |x|X)\]\s+(.*)$/);if(m){cb=m[1]===" "?'<span class="md-cb">☐</span> ':'<span class="md-cb done">☑</span> ';txt=m[2]}
      out.push(`<li${m&&m[1]!==" "?' class="done"':""}>${cb}${mdInline(txt)}</li>`);continue}
    flushList();para.push(line.trim());
  }
  flushPara();flushList();flushTable();if(code)out.push("</pre>");
  return out.join("\n");
}
// Витягти секцію за заголовком (## Назва) — до наступного заголовка того ж/вищого рівня
function mdSection(md,title){
  const lines=String(md||"").replace(/\r/g,"").split("\n");let lvl=0,buf=null;
  for(const l of lines){const h=l.match(/^(#{1,4})\s+(.*)$/);
    if(h){if(buf!==null&&h[1].length<=lvl)break;if(buf===null&&h[2].trim().toLowerCase().startsWith(title.toLowerCase())){lvl=h[1].length;buf=[];continue}}
    if(buf!==null)buf.push(l)}
  return buf?buf.join("\n"):"";
}
