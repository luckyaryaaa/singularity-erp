'use strict';
const { getPool }=require('./pool');
const events=require('../../core/events');

let timer=null,running=false;
async function dispatchBatch(limit=50){
  if(running)return 0;running=true;const client=await getPool().connect();
  try{
    await client.query('BEGIN');
    const rows=(await client.query(`SELECT * FROM domain_event_outbox WHERE published_at IS NULL ORDER BY created_at
      FOR UPDATE SKIP LOCKED LIMIT $1`,[limit])).rows;
    for(const row of rows){
      try{events.publish(row.event_type,row.payload);await client.query('UPDATE domain_event_outbox SET published_at=now(),attempts=attempts+1,last_error=NULL WHERE id=$1',[row.id]);}
      catch(error){await client.query('UPDATE domain_event_outbox SET attempts=attempts+1,last_error=$2 WHERE id=$1',[row.id,String(error.message).slice(0,1000)]);}
    }
    await client.query('COMMIT');return rows.length;
  }catch(error){try{await client.query('ROLLBACK');}catch{}throw error;}finally{client.release();running=false;}
}
function start(intervalMs=1000){if(timer)return;timer=setInterval(()=>dispatchBatch().catch(error=>console.error(JSON.stringify({level:'error',service:'outbox',message:error.message}))),intervalMs);timer.unref();}
function stop(){if(timer){clearInterval(timer);timer=null;}}
module.exports={dispatchBatch,start,stop};
