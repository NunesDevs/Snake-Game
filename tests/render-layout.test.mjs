import test from 'node:test';
import assert from 'node:assert/strict';
import { boardLayout } from '../web/render-layout.mjs';

test('zero, hidden and transiently tiny canvases produce no drawable geometry', () => {
  for (const [width, height] of [[0,0],[1,1],[16,260],[310,16],[24,320],[95,320],[-1,320],[NaN,320],[320,Infinity]]) {
    assert.equal(boardLayout(width,height,24,20),null,`${width}x${height}`);
  }
});

test('all supported layouts have finite positive segments and valid radii', () => {
  for(const width of [96,100,240,310,974,1920])for(const height of [84,100,260,320])for(const ratio of [0,0.5,1,2,3,NaN]) {
    const layout=boardLayout(width,height,24,20,ratio);
    if(!layout)continue;
    assert.ok(Object.values(layout).every(Number.isFinite));
    assert.ok(layout.segment>0);
    assert.ok(layout.radius>=0&&layout.radius<=layout.segment/2);
    assert.ok(layout.pixelWidth>=1&&layout.pixelHeight>=1);
    assert.ok(layout.x>=0&&layout.y>=0);
  }
  const minimum=boardLayout(96,84,24,20);
  assert.equal(minimum.segment,1);
  assert.equal(minimum.radius,0.5);
});
