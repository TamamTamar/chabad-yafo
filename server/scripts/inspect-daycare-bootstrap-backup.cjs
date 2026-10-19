// Build server first. Pass a local archive.gz path; output is aggregate only.
const fs=require('node:fs');const zlib=require('node:zlib');
const {deserialize}=require('bson');
const defaults=require('../dist/routes/admin/daycareDefaults.js');
const bytes=zlib.gunzipSync(fs.readFileSync(process.argv[2]));
const stats={};let collection='',offset=4,errors=0,decoded=0;
while(offset<bytes.length){const n=bytes.readInt32LE(offset);if(n===-1){offset+=4;continue;}if(n<5||offset+n>bytes.length){errors++;break;}let doc;try{doc=deserialize(bytes.subarray(offset,offset+n));}catch{errors++;break;}decoded++;offset+=n;
 if(typeof doc.collection==='string'&&typeof doc.db==='string'){collection=doc.collection;continue;}
 if(!['daycaretasks','daycaredocuments','daycarefinancesettings'].includes(collection)||!doc._id)continue;
 const stat=stats[collection]??={records:0,matchingDefaults:0,initializedMarkers:0,missingDefaultFileLinks:0};stat.records++;
 if(collection==='daycaretasks'&&defaults.defaultDaycareTasks.some(x=>x.title===doc.title))stat.matchingDefaults++;
 if(collection==='daycaredocuments'){const d=defaults.defaultDaycareDocuments.find(x=>x.name===doc.name);if(d)stat.matchingDefaults++;if(d?.fileUrl&&!doc.fileUrl)stat.missingDefaultFileLinks++;}
 if(doc.taskDefaultsInitialized===true)stat.initializedMarkers++;
 const created=doc.createdAt instanceof Date?doc.createdAt.toISOString():undefined;if(created){stat.earliestCreated=stat.earliestCreated&&stat.earliestCreated<created?stat.earliestCreated:created;stat.latestCreated=stat.latestCreated&&stat.latestCreated>created?stat.latestCreated:created;}
}
console.log(JSON.stringify({source:'offline archive inspection only; no database connection or restore',decoded,complete:offset===bytes.length,errors,stats},null,2));

if (offset !== bytes.length || errors) process.exitCode = 1;
