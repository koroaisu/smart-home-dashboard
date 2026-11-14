import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreNotifications,collectNotifications,notificationSpeech,unreadCount} from './notifications.js';
const event={source:'ac',key:'ac:24',title:'エアコン',text:'24℃'};
test('notification count takes precedence only for two or more unread items',()=>{
 const inbox={items:[]};assert.equal(notificationSpeech(inbox,'通常'),'通常');
 inbox.items.push({read:false});assert.equal(notificationSpeech(inbox,'通常'),'通常');
 inbox.items.push({read:false});assert.equal(notificationSpeech(inbox,'通常'),'通知が2件あります。');
 inbox.items[0].read=true;assert.equal(notificationSpeech(inbox,'通常'),'通常');
});
test('polling does not duplicate notifications or resurrect read ones',()=>{
 let inbox=collectNotifications(restoreNotifications(null),[event],1);assert.equal(unreadCount(inbox),1);
 inbox.items[0].read=true;inbox=collectNotifications(inbox,[event],2);assert.equal(inbox.items.length,1);assert.equal(unreadCount(inbox),0);
 inbox=collectNotifications(inbox,[{...event,key:'ac:25'}],3);assert.equal(inbox.items.length,2);assert.equal(unreadCount(inbox),1);
 assert.equal(unreadCount(restoreNotifications(JSON.stringify(inbox))),1);
});
test('corrupt saved notification data is discarded',()=>{
 assert.deepEqual(restoreNotifications('{'),{seen:{},items:[]});
 assert.equal(restoreNotifications(JSON.stringify({items:[null,{title:'invalid'}]})).items.length,0);
});
test('only schedule speech has a destination',async()=>{
 const {speechDestination}=await import('./notifications.js');
 assert.equal(speechDestination('通知が4件あります。'),null);
 assert.equal(speechDestination('加湿器から通知があります。'),null);
 assert.equal(speechDestination('今日は、お部屋を整える日にしませんか？'),null);
 assert.equal(speechDestination('今日は「買い出し」の日です。18:00からだよ。'),'calendar');
});
