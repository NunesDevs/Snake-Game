import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnake, startSnake, stepSnake, setSnakeMode, setSnakeRate, resetSnake, arenaWalls, placeFood } from '../web/engine.mjs';
const same = (a,b) => a.x === b.x && a.y === b.y;
test('portals wrap all four borders while classic walls remain fatal', () => {
  const base = startSnake(createSnake({ mode: 'portal' }));
  for (const [head,direction,expected] of [[{x:23,y:2},'right',{x:0,y:2}],[{x:0,y:2},'left',{x:23,y:2}],[{x:2,y:0},'up',{x:2,y:19}],[{x:2,y:19},'down',{x:2,y:0}]]) {
    const s = {...base, body:[head], direction, food:{x:9,y:9}};
    assert.deepEqual(stepSnake(s).body[0], expected);assert.equal(stepSnake(s).status, 'running');
    assert.equal(stepSnake({...s,mode:'classic'}).status,'gameover');
  }
});
test('wrapping still collides with the body and arena walls end the run', () => {
  const base = startSnake(createSnake({ mode: 'portal' }));
  assert.equal(stepSnake({...base,body:[{x:23,y:2},{x:0,y:2},{x:1,y:2}],direction:'right'}).status,'gameover');
  const arena = startSnake(createSnake({mode:'arena'})), wall=arena.walls[0];
  assert.equal(stepSnake({...arena,body:[{x:wall.x-1,y:wall.y}],direction:'right'}).status,'gameover');
});
test('arena free cells stay connected and food never occupies a wall or the initial body', () => {
  for (const cols of [4,10,12,24,31,64]) for (const rows of [4,8,11,20,35,64]) {
    const s=createSnake({cols,rows,mode:'arena'},()=>0.99),blocked=new Set(s.walls.map(p=>p.y*cols+p.x));
    assert.ok(!s.body.some(p=>blocked.has(p.y*cols+p.x)));
    assert.ok(![...s.body,...s.walls].some(p=>same(p,s.food)));
    const seen=new Set([0]),queue=[0];
    for (let i=0;i<queue.length;i++){const n=queue[i],x=n%cols,y=Math.floor(n/cols);
      for(const [nx,ny]of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){const k=ny*cols+nx;
        if(nx>=0&&nx<cols&&ny>=0&&ny<rows&&!blocked.has(k)&&!seen.has(k)){seen.add(k);queue.push(k);}}}
    assert.equal(seen.size,cols*rows-blocked.size);
  }
  assert.ok(arenaWalls(24,20).length>0);
});
test('fourth normal food creates a separate free bonus and collecting it scores 30 without growth', () => {
  let s=startSnake(createSnake({mode:'arena'}));
  s={...s,eaten:3,food:{x:s.body[0].x+1,y:s.body[0].y}};
  const next=stepSnake(s,()=>0);assert.equal(next.eaten,4);assert.equal(next.score,10);assert.ok(next.bonus);
  assert.ok(![...next.body,...next.walls,next.food].some(p=>same(p,next.bonus)));
  const bonusStep=stepSnake({...next,bonus:{x:next.body[0].x+1,y:next.body[0].y},food:{x:0,y:0}});
  assert.equal(bonusStep.score,40);assert.equal(bonusStep.body.length,next.body.length);assert.equal(bonusStep.bonus,null);
  assert.equal(s.eaten,3);
});
test('a bonus cannot occupy the last free cell and block board completion', () => {
  const base=startSnake(createSnake({cols:4,rows:4}));
  const body=[];for(let y=0;y<4;y++)for(let x=0;x<4;x++)if(!(x===3&&[0,3].includes(y)))body.push({x,y});
  const s={...base,body:[{x:2,y:0},...body.filter(p=>!(p.x===2&&p.y===0))],direction:'right',food:{x:3,y:0},bonus:{x:3,y:3}};
  const next=stepSnake(s,()=>0);assert.equal(next.status,'running');assert.deepEqual(next.food,{x:3,y:3});assert.equal(next.bonus,null);
  assert.equal(placeFood([...next.body,next.food],4,4),null);
});
test('mode changes reset score fairly, preserve best and survive rate and restart changes', () => {
  const changed=setSnakeMode({...createSnake(),score:90},'arena');
  assert.equal(changed.status,'ready');assert.equal(changed.score,0);assert.equal(changed.best,90);
  assert.equal(setSnakeRate(changed,12).mode,'arena');assert.equal(resetSnake(changed).mode,'arena');
  assert.throws(()=>setSnakeMode(changed,'unknown'),RangeError);
});
