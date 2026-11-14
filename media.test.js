import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMedia } from './media.mjs';
test('recognizes native apps without guessing a browser service',()=>{
  assert.equal(normalizeMedia({status:'available',source:'AppleInc.AppleMusic_123!App'}).service,'Apple Music');
  assert.equal(normalizeMedia({status:'available',source:'AmazonMusic.exe'}).service,'Amazon Music');
  const browser=normalizeMedia({status:'available',source:'chrome.exe',title:'Amazon Music'});
  assert.equal(browser.service,'Google Chrome');assert.equal(browser.browser,true);
});
test('does not retain stale song information on idle or failure',()=>{
  assert.deepEqual(normalizeMedia({status:'idle',title:'old song'}),{status:'idle'});
  assert.deepEqual(normalizeMedia(null),{status:'unavailable'});
  const media=normalizeMedia({status:'available',source:'unknown',title:'a'.repeat(1000),playback:'invalid'});
  assert.equal(media.title.length,500);assert.equal(media.playback,'Unknown');
});
test('accepts bounded image data and rejects remote or unsafe artwork',()=>{
  const source={status:'available'};
  assert.equal(normalizeMedia({...source,artwork:'data:image/png;base64,YQ=='}).artwork,'data:image/png;base64,YQ==');
  for(const artwork of ['https://example.com/private.jpg','data:image/svg+xml;base64,YQ==','data:image/png;base64,'+'A'.repeat(1500000)])assert.equal(normalizeMedia({...source,artwork}).artwork,'');
});
test('normalizes missing and invalid timeline values',()=>{
  assert.equal(normalizeMedia({status:'available',duration:-1,position:Infinity}).duration,null);
  assert.equal(normalizeMedia({status:'available',position:Infinity}).position,null);
  const media=normalizeMedia({status:'available',duration:240,position:45});
  assert.equal(media.duration,240);assert.equal(media.position,45);
});
