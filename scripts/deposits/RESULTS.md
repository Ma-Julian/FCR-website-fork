# Ethereum deposits per chain: own bridge vs Across, 19 Oct 2025 – 19 Oct 2026

Ethereum blocks 23,611,840–26,226,761, read from MEV Blocker's RPC (`rpc.flashbots.net` silently returns no logs; don't use it).
Spot-checked against publicnode on recent blocks: identical counts. These are the figures behind `data/measured.json`.

- `across.py CHAIN_ID …`: counts `FundsDeposited` on the Across SpokePool by destination chain (topic filter).
- `canon.py [NAME …]`: counts each chain's own-bridge deposit events (contract and event per chain in the script). For chains measured on 20 Oct the count is distinct transactions; Base, Arbitrum One, OP Mainnet, World Chain, Ink, Unichain and Soneium were measured on 19 Oct (event counts, see the project notes).

| Chain | Own bridge | Across | Across share | Contract |
|---|---|---|---|---|
| Base | 181,873 | 572,770 | 76% | `0x49048044D57e1C92A77f79988d21Fa8fAF74E97e` |
| Arbitrum One | 115,760 | 205,008 | 64% | `0x8315177aB297bA92A06054cE80a67Ed4DBd7ed3a` |
| OP Mainnet | 80,110 | 17,531 | 18% | `0xbEb5Fc579115071764c7423A4f12eDde41f106Ed` |
| World Chain | 52,037 | 4,032 | 7% | `0xd5ec14a83B7d95BE1E2AC12523e2dEE12Cbeea6C` |
| Ink | 20,243 | 9,505 | 32% | `0x5d66C1782664115999C47c9fA5cd031f495D3e4F` |
| Unichain | 17,993 | 11,806 | 40% | `0x0bd48f6B86a26D3a217d0Fa6FfE2B491B956A7a2` |
| Soneium | 16,844 | 5,777 | 26% | `0x88e529A6ccd302c948689Cd5156C83D4614FAE92` |
| Linea | 20,827 | 17,277 | 45% | `0xd19d4B5d358258f05D7B411E21A1460D11B0876F` |
| Scroll | 32,578 | 1,006 | 3% | `0x6774Bcbd5ceCeF1336b5300fb5186a12DDD8b367` |
| ZKsync Era | 27,408 | 2,831 | 9% | `0x32400084C286CF3E17e7B677ea9583e60a000324` |
| Starknet | 18,477 | – | – | `0xc662c410C0ECf747543f5bA90660f6ABeBD9C8c4` |
| Paradex | 16,024 | – | – | `0xF338cad020D506e8e3d9B4854986E0EcE6C23640` |
| Taiko | 2,596 | – | – | `0xd60247c6848B7Ca29eDdF63AA924E53dB6Ddd8EC` |
| Mantle | 3,296 | – | – | `0xc54cb22944F2bE476E02dECfCD7e3E7d3e15A8Fb` |
| Zora | 5,850 | 759 | 11% | `0x1a0ad011913A150f69f6A19DF447A0CfD9551054` |
| Mode | 7,033 | 244 | 3% | `0x8B34b14c7c7123459Cf3076b8Cb929BE097d0C07` |
| Metal | 688 | – | – | `0x3F37aBdE2C6b5B2ed6F8045787Df1ED1E3753956` |
| Hemi | 1,040 | – | – | `0x39a0005415256B9863aFE2d55Edcf75ECc3A4D7e` |
| Robinhood Chain | 47,162 | 468,181 | 91% | `0xDf8755334ce7A73cCF6b581C02eA649AE3E864b3` |
| Arbitrum Nova | 628 | – | – | `0xC1Ebd02f738644983b6C4B2d440b8e77DdE276Bd` |
| Morph | 2,336 | – | – | `0x3931Ade842F5BB8763164bDd81E5361DcE6cC1EF` |
| ADI Chain | 498 | – | – | `0x0583Ef2B6416cb7B287406438B940E4d99680C5B` |
| Lighter | 209,891 | – | – | `0x3B4D794a66304F130a4Db8F2551B0070dfCf5ca7` |
| Aztec | 2,382 | – | – | `0x7d4Ef0676c2032bbCC09227501D34d86641ab8cA` |
| Katana | 18,197 | – | – | `0x2a3DD3EB832aF982ec71669E178424b10Dca2EDe` |
| Celo | 1,203 | – | – | `0xc5c5D157928BDBD2ACf6d0777626b6C75a9EAEDC` |
| Polygon PoS | 96,745 | 95,202 | 50% | `0x28e4F3a7f651294B9564800b2D01f35189A5bFbE` |
| MegaETH | 55,871 | 7,196 | 11% | `0x7f82f57F0Dd546519324392e408b01fcC7D709e8` |
| Gnosis Chain | 19,564 | – | – | AMB `0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e` + xDAI bridge `0x4aa42145Aa6Ebf72e164C9bBC74fbD3788045016` |
| Fraxtal | 3,090 | – | – | `0x36cb65c1967A0Fb0EEE11569C51C2f2aA1Ca6f6D` |
| Manta Pacific | 1,868 | – | – | `0x9168765EE952de7C6f8fC6FaD5Ec209B960b7622` |
| BOB | 1,826 | – | – | `0x8AdeE124447435fE03e3CD24dF3f4cAE32E65a3E` |
| Plume | 1,065 | – | – | `0x35381f63091926750F43b2A7401B083263aDEF83` |
| Metis | 961 | – | – | `0x56a76bcC92361f6DF8D75476feD8843EdC70e1C9` |
| X Layer | 1,413 | – | – | `0x2a3DD3EB832aF982ec71669E178424b10Dca2EDe` |

Lighter and Starknet emit several events per transaction, so they count transactions.

"–" means Across doesn't deliver to that chain; it doesn't mean no one routes around the own bridge. Lighter, for example, gets fast deposits through Relay (its chain id 3586256), Fun.xyz deposit addresses and CCTP, none of which are measured here.

Ronin isn't in the table: its OptimismPortal (live since the L2 migration on 12 May 2026) carried 32 deposits in the window, and its users bridge through Chainlink CCIP, which we haven't counted for the full year (the current Ethereum → Ronin onRamp, 0xc342…50b7, carried 61 messages in the last ~7 days).
