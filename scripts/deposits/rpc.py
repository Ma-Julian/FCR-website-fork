import requests, json, time, sys, threading
from concurrent.futures import ThreadPoolExecutor
RPC='https://rpc.mevblocker.io'
S=requests.Session()
def call(method, params, tries=6):
    for t in range(tries):
        try:
            r=S.post(RPC,json={'jsonrpc':'2.0','id':1,'method':method,'params':params},timeout=60)
            j=r.json()
            if 'error' in j: raise RuntimeError(j['error'])
            return j['result']
        except Exception as e:
            err=e; time.sleep(1.5*(t+1))
    raise err
def logs(address, topics, a, b):
    """all logs in [a,b], splitting ranges that are too big"""
    try:
        return call('eth_getLogs',[{'address':address,'topics':topics,'fromBlock':hex(a),'toBlock':hex(b)}],tries=2)
    except Exception as e:
        if a==b: raise
        m=(a+b)//2
        return logs(address,topics,a,m)+logs(address,topics,m+1,b)
def scan(address, topics, a=23611840, b=26226761, step=50000, workers=8, keep=None):
    ranges=[(x,min(x+step-1,b)) for x in range(a,b+1,step)]
    out=[]
    def job(r):
        L=logs(address,topics,*r)
        return [keep(l) for l in L] if keep else L
    with ThreadPoolExecutor(workers) as ex:
        for res in ex.map(job,ranges): out+=res
    return out
