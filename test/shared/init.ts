import { Wallet, Contract, providers } from 'ethers'
import { Web3Provider } from 'ethers/providers'
import { deployContract } from 'ethereum-waffle'

import { expandTo18Decimals } from './utilities'

import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import UniswapV2Router01 from '@uniswap/v2-periphery/build/UniswapV2Router01.json'
import ERC20 from '../../build/ERC20.json'
import WETH9 from '../../build/WETH9.json'
import UniswapV1Exchange from '../../build/UniswapV1Exchange.json'
import UniswapV1Factory from '../../build/UniswapV1Factory.json'
import UniswapV2Migrator from '@uniswap/v2-periphery/build/UniswapV2Migrator.json'

export async function initialiseDemo() {
  let url = 'https://ropsten.infura.io/v3/7e99d705c25844b59df18449632dd97c'
  let provider = new providers.JsonRpcProvider(url)
  let privateKey = '0x1C873C7966BA081030B912574242AA3B8B7E1AEDEC499A17B8AEB63C4F68D714'

  let wallet = new Wallet(privateKey, provider)
  let WETHAddress = '0xc778417e063141139fce010982780140aa0cd5ab'
  let V1Factory = '0x9c83dCE8CA20E9aAF9D3efc003b2ea62aBC08351'
  let V2Factory = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
  let V2Router = '0xf164fC0Ec4E93095b804a4795bBe1e041497b92a'
  let WETHPartnerAddress = '0x0992D6471451dE667F58C8ef718b083f79934804'
  console.log('sit back and relax, this is gonna take a while')
  try {
    // console.log('deploying new token')
    // const WETHPartner = await deployContract(wallet, ERC20, [expandTo18Decimals(10000000000)])
    // console.log('created weth partner', WETHPartner.address)
    // const factoryV1 = new Contract(V1Factory, JSON.stringify(UniswapV1Factory.abi), provider).connect(wallet)
    const factoryV2 = new Contract(V2Factory, JSON.stringify(UniswapV2Factory.abi), provider).connect(wallet)
    // console.log('Creating an exchange for our token on V1', WETHPartner.address)
    // // console.log('result', await factoryV1.createExchange(WETHPartner.address))

    // const WETHExchangeV1Address = await factoryV1.getExchange(WETHPartner.address)
    // const WETHExchangeV1 = new Contract(WETHExchangeV1Address, JSON.stringify(UniswapV1Exchange.abi), provider).connect(
    //   wallet
    // )
    // console.log('creating an pair on V2', await factoryV2.createPair(WETHAddress, WETHPartner.address))
    const WETHPairAddress = await factoryV2.getPair(WETHAddress, WETHPartnerAddress)
    const WETHPair = new Contract(WETHPairAddress, JSON.stringify(IUniswapV2Pair.abi), provider).connect(wallet)
    const Router = new Contract(V2Router, JSON.stringify(UniswapV2Router01.abi), provider).connect(wallet)
    const reservesV2 = (await WETHPair.getReserves()).slice(0, 2)
    const WETHPairToken0 = await WETHPair.token0()
    const priceV2 =
      WETHPairToken0 === WETHPartnerAddress ? reservesV2[0].div(reservesV2[1]) : reservesV2[1].div(reservesV2[0])
    console.log('price on V2', priceV2.toString())
  } catch (e) {
    console.log('error while deploying contracts', e)
  }
}

initialiseDemo()
