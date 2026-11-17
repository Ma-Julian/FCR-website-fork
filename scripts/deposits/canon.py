import sys, json; sys.path.insert(0,'.')
from rpc import scan
from Crypto.Hash import keccak
def t(s): h=keccak.new(digest_bits=256); h.update(s.encode()); return '0x'+h.hexdigest()
W=lambda d,i: int(d[2+64*i:2+64*(i+1)],16)
TD=t('TransactionDeposited(address,address,uint256,bytes)')
MD=t('MessageDelivered(uint256,bytes32,address,uint8,address,bytes32,uint256,uint64)')
def opmint(l): return W(l['data'],2)   # offset, len, then opaque: mint is first 32 bytes
C={
 # name: (address, topics, keep(log)->(ok, eth_wei))
 'Zora':('0x1a0ad011913A150f69f6A19DF447A0CfD9551054',[TD],lambda l:(1,opmint(l))),
 'Mode':('0x8B34b14c7c7123459Cf3076b8Cb929BE097d0C07',[TD],lambda l:(1,opmint(l))),
 'Metal':('0x3F37aBdE2C6b5B2ed6F8045787Df1ED1E3753956',[TD],lambda l:(1,opmint(l))),
 'Hemi':('0x39a0005415256B9863aFE2d55Edcf75ECc3A4D7e',[TD],lambda l:(1,opmint(l))),
 'Celo':('0xc5c5D157928BDBD2ACf6d0777626b6C75a9EAEDC',[TD],lambda l:(1,opmint(l))),
 'MegaETH':('0x7f82f57F0Dd546519324392e408b01fcC7D709e8',[TD],lambda l:(1,opmint(l))),
 'Ronin':('0x652CD53eCf9466E5Fb00D0E11d6CBf6469a56D77',[TD],lambda l:(1,opmint(l))),
 'Ronin gateway':('0x64192819Ac13Ef72bF6b5AE239AC672B43a9AF08',[t('DepositRequested(bytes32,(uint256,uint8,(address,address,uint256),(address,address,uint256),(uint8,uint256,uint256)))')],lambda l:(1,0)),
 'Polygon PoS':('0x28e4F3a7f651294B9564800b2D01f35189A5bFbE',[t('StateSynced(uint256,address,bytes)')],lambda l:(1,0)),
 'BOB':('0x8AdeE124447435fE03e3CD24dF3f4cAE32E65a3E',[TD],lambda l:(1,opmint(l))),
 'Fraxtal':('0x36cb65c1967A0Fb0EEE11569C51C2f2aA1Ca6f6D',[TD],lambda l:(1,0)),
 'Manta Pacific':('0x9168765EE952de7C6f8fC6FaD5Ec209B960b7622',[TD],lambda l:(1,opmint(l))),
 'Metis':('0x56a76bcC92361f6DF8D75476feD8843EdC70e1C9',[t('TransactionEnqueued(uint256,address,address,uint256,bytes,uint256,uint256)')],lambda l:(W(l['data'],0)==1088,0)),
 'Plume':('0x35381f63091926750F43b2A7401B083263aDEF83',[MD],lambda l:(int(l['data'][26:66],16)==0x943fc691242291B74B105e8D19bd9E5DC2fcBa1D,0)),
 'Gnosis AMB':('0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e',[t('UserRequestForAffirmation(bytes32,bytes)')],lambda l:(1,0)),
 'Gnosis xDAI':('0x4aa42145Aa6Ebf72e164C9bBC74fbD3788045016',[t('UserRequestForAffirmation(address,uint256,bytes32)')],lambda l:(1,0)),
 'Mantle':('0xc54cb22944F2bE476E02dECfCD7e3E7d3e15A8Fb',[TD],lambda l:(1,0)),
 'Arbitrum Nova':('0xC1Ebd02f738644983b6C4B2d440b8e77DdE276Bd',[MD],lambda l:(int(l['data'][26:66],16)==0xc4448b71118c9071Bcb9734A0EAc55D18A153949,0)),
 'Robinhood Chain':('0xDf8755334ce7A73cCF6b581C02eA649AE3E864b3',[MD],lambda l:(int(l['data'][26:66],16)==0x1A07cc4BD17E0118BdB54D70990D2158AbAD7a2D,0)),
 'Linea':('0xd19d4B5d358258f05D7B411E21A1460D11B0876F',[t('MessageSent(address,address,uint256,uint256,uint256,bytes,bytes32)')],lambda l:(1,W(l['data'],1))),
 'Scroll':('0x6774Bcbd5ceCeF1336b5300fb5186a12DDD8b367',[t('SentMessage(address,address,uint256,uint256,uint256,bytes)')],lambda l:(1,W(l['data'],0))),
 'ZKsync Era':('0x32400084C286CF3E17e7B677ea9583e60a000324',[t('NewPriorityRequestId(uint256,bytes32)')],lambda l:(1,0)),
 'ADI Chain':('0x0583Ef2B6416cb7B287406438B940E4d99680C5B',[t('NewPriorityRequestId(uint256,bytes32)')],lambda l:(1,0)),
 'Starknet':('0xc662c410C0ECf747543f5bA90660f6ABeBD9C8c4',[t('LogMessageToL2(address,uint256,uint256,uint256[],uint256,uint256)')],lambda l:(1,0)),
 'Paradex':('0xF338cad020D506e8e3d9B4854986E0EcE6C23640',[t('LogMessageToL2(address,uint256,uint256,uint256[],uint256,uint256)')],lambda l:(1,0)),
 'Taiko':('0xd60247c6848B7Ca29eDdF63AA924E53dB6Ddd8EC',[t('MessageSent(bytes32,(uint64,uint64,uint32,address,uint64,address,uint64,address,address,uint256,bytes))')],lambda l:(1,0)),
 'Morph':('0x3931Ade842F5BB8763164bDd81E5361DcE6cC1EF',[t('QueueTransaction(address,address,uint256,uint64,uint256,bytes)')],lambda l:(1,0)),
 'Lighter':('0x3B4D794a66304F130a4Db8F2551B0070dfCf5ca7',[t('Deposit(uint48,address,uint16,uint8,uint128)')],lambda l:(1,0)),
 'Aztec':('0x7d4Ef0676c2032bbCC09227501D34d86641ab8cA',[t('MessageSent(uint256,uint256,bytes32,bytes16)')],lambda l:(1,0)),
 'Agglayer':('0x2a3DD3EB832aF982ec71669E178424b10Dca2EDe',[t('BridgeEvent(uint8,uint32,address,uint32,address,uint256,bytes,uint32)')],lambda l:(W(l['data'],3), W(l['data'],5) if W(l['data'],0)==0 and W(l['data'],2)==0 else 0)),
}
import os
OUT=os.environ.get('OUT','canon.json')
names=sys.argv[1:] or list(C)
try: res=json.load(open(OUT))
except Exception: res={}
for n in names:
    if n in res: continue
    a,topics,f=C[n]
    rows=scan(a,topics,step=50000,workers=8,keep=lambda l:(f(l),l['transactionHash']))
    if n=='Agglayer':
        from collections import Counter
        cnt=Counter(); eth=Counter()
        for (net,w),_ in rows: cnt[net]+=1; eth[net]+=w
        res[n]={'byNetwork':{k:[cnt[k],eth[k]/1e18] for k in cnt}}
    else:
        ok=[(w,h) for (o,w),h in rows if o]
        res[n]={'deposits':len(ok),'eth':sum(w for w,_ in ok)/1e18,'txs':len({h for _,h in ok})}
    print(n,res[n] if n!='Agglayer' else sorted(res[n]['byNetwork'].items(),key=lambda x:-x[1][0])[:8],flush=True)
    json.dump(res,open(OUT,'w'),indent=1)
