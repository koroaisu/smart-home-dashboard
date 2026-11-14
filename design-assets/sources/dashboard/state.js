export const dateKey = (date=new Date()) => [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
export const deviceDefinitions = [
  {id:'ac',name:'エアコン',icon:'ac',on:true,value:24,min:16,max:30,unit:'℃',setting:'設定温度'},
  {id:'floor',name:'フロアランプ',icon:'floor',on:true,value:70,min:0,max:100,unit:'%',setting:'明るさ'},
  {id:'ceiling',name:'天井照明',icon:'light',on:true,value:65,min:0,max:100,unit:'%',setting:'明るさ'},
  {id:'humidifier',name:'加湿器',icon:'drop',on:true,value:55,min:30,max:70,unit:'%',setting:'目標湿度'},
  {id:'fan',name:'サーキュレーター',icon:'fan',on:false,value:2,min:1,max:5,unit:'段',setting:'風量'},
  {id:'purifier',name:'空気清浄機',icon:'air',on:true,value:1,min:1,max:3,unit:'段',setting:'風量'},
];
export const initialState = () => ({ lights: {living:true, desk:false}, brightness:65, vacuum:'docked', tasks:[],devices:Object.fromEntries(deviceDefinitions.map(d=>[d.id,{on:d.on,value:d.value}])) });
export function restoreState(raw) {
  const result=initialState();
  try {
    const data=JSON.parse(raw);
    for (const key of ['living','desk']) if(typeof data?.lights?.[key]==='boolean') result.lights[key]=data.lights[key];
    if(Number.isFinite(data?.brightness)) result.brightness=Math.max(0,Math.min(100,Math.round(data.brightness)));
    for (const definition of deviceDefinitions) {
      const saved=data?.devices?.[definition.id];
      if(typeof saved?.on==='boolean') result.devices[definition.id].on=saved.on;
      if(Number.isFinite(saved?.value)) result.devices[definition.id].value=Math.max(definition.min,Math.min(definition.max,Math.round(saved.value)));
    }
    if(!data?.devices && data?.lights){result.devices.ceiling.on=result.lights.living;result.devices.ceiling.value=result.brightness;result.devices.floor.on=result.lights.desk;}
    if(Array.isArray(data?.tasks)) result.tasks=data.tasks.filter(t=>typeof t?.id==='string' && typeof t?.title==='string' && t.title.trim() && /^([01]\d|2[0-3]):[0-5]\d$/.test(t.time) && typeof t.done==='boolean').slice(0,100).map(t=>({...t,title:t.title.slice(0,80),date:validDate(t.date)?t.date:dateKey()}));
  } catch {}
  // A simulated running device must never be restored as an actual live state.
  return result;
}

export function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [y,m,d]=value.split('-').map(Number);return dateKey(new Date(y,m-1,d))===value;}
