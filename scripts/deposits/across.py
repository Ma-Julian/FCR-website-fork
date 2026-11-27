import sys, json; sys.path.insert(0,'.')
from rpc import scan
T='0x32ed1a409ef04c7b0227189c3a103dc5ac10e775a15b785dcc510201f7c25ad3'
SP='0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5'
ids=[int(x) for x in sys.argv[1:]]
res={}
for cid in ids:
    t1='0x'+hex(cid)[2:].rjust(64,'0')
    L=scan(SP,[T,t1],step=100000,workers=8,keep=lambda l:(int(l['blockNumber'],16),l['transactionHash']))
    res[cid]=len(L); print(cid,len(L),flush=True)
    json.dump(res,open(__import__('os').environ.get('OUT','across.json'),'w'),indent=1)
