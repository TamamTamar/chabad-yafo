// Managed non-production processes can never contact external providers.
const net=require('node:net');const original=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){const first=Array.isArray(args[0])?args[0][0]:args[0];const host=typeof first==='object'?first.host:typeof args[1]==='string'?args[1]:'localhost';
 if(first?.path||!['127.0.0.1','localhost','::1'].includes(host||'localhost'))throw Error('EXTERNAL_NETWORK_DISABLED');
 return original.apply(this,args);
};
const originalFetch=global.fetch;
global.fetch=(input,...rest)=>{const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))return Promise.reject(Error('EXTERNAL_NETWORK_DISABLED'));return originalFetch(input,...rest);};
