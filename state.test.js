import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,restoreState} from './state.js';
import {dateKey,validDate} from './state.js';
test('old tasks migrate to today while dated tasks retain their day',()=>{
  const task={id:'1',title:'買い物',time:'18:00',done:false};
  const restored=restoreState(JSON.stringify({tasks:[task,{...task,id:'2',date:'2026-12-01'}]}));
  assert.equal(restored.tasks[0].date,dateKey());
  assert.equal(restored.tasks[1].date,'2026-12-01');
});
test('dates use local days and reject impossible dates',()=>{
  assert.equal(dateKey(new Date(2026,10,8,23,59)),'2026-11-08');
  assert.equal(validDate('2026-02-30'),false);
  assert.equal(validDate('2028-02-29'),true);
});
test('old light settings migrate without losing saved tasks',()=>{
  const result=restoreState(JSON.stringify({lights:{living:false,desk:true},brightness:40,tasks:[{id:'old',title:'買い物',time:'18:00',done:false,date:'2026-11-08'}]}));
  assert.deepEqual(result.devices.ceiling,{on:false,value:40});
  assert.equal(result.devices.floor.on,true);
  assert.equal(result.tasks[0].title,'買い物');
});
test('device restore rejects invalid flags and bounds settings independently',()=>{
  const result=restoreState(JSON.stringify({devices:{ac:{on:'true',value:100},humidifier:{on:false,value:0},fan:{on:true,value:4.6},floor:{value:'90'}}}));
  assert.deepEqual(result.devices.ac,{on:true,value:30});
  assert.deepEqual(result.devices.humidifier,{on:false,value:30});
  assert.deepEqual(result.devices.fan,{on:true,value:5});
  assert.equal(result.devices.floor.value,70);
  result.devices.ac.value=18;
  assert.equal(initialState().devices.ac.value,24);
});
test('invalid or inaccessible stored data falls back safely',()=>{for(const raw of [null,'broken','null','[]'])assert.deepEqual(restoreState(raw),initialState());});
test('restores settings but never resumes a simulated vacuum',()=>{const saved={lights:{living:false,desk:true},brightness:900,vacuum:'running',tasks:[{id:'1',title:'買い物',time:'18:00',done:false},{id:'2',title:'bad',time:'25:99',done:false}]};const state=restoreState(JSON.stringify(saved));assert.equal(state.vacuum,'docked');assert.equal(state.brightness,100);assert.equal(state.lights.desk,true);assert.equal(state.tasks.length,1);});
