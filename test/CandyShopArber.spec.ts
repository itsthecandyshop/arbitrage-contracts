import chai, {expect} from 'chai'
import {MaxUint256} from 'ethers/constants'
import {BigNumber, bigNumberify, defaultAbiCoder, formatEther} from 'ethers/utils'
import {solidity, MockProvider, createFixtureLoader, deployContract} from 'ethereum-waffle'
import {expandTo18Decimals} from './shared/utilities'
import {v2Fixture} from './shared/fixtures'
import CandyShopArber from '../build/CandyShopArber.json'
chai.use(solidity)
import {Contract} from 'ethers'
import {getWallets} from 'ethereum-waffle'
import {waffle} from '@nomiclabs/buidler'

const overrides = {}

describe('CandyShopArber', () => {
  // const provider = new MockProvider({
  //   hardfork: 'istanbul',
  //   mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
  //   gasLimit: 9999999
  // })
  // const provider = Waffle.provider
  const provider = waffle.provider

  const [wallet] = provider.getWallets()
  const loadFixture = createFixtureLoader(provider, [wallet])
  let globalFixtures: any
  let WETH: Contract
  let WETHPartner: Contract
  let WETHExchangeV1: Contract
  let WETHPair: Contract
  let candyShopArber: Contract
  let V2Router: Contract

  beforeEach(async function() {
    const fixture = await loadFixture(v2Fixture)

    WETH = fixture.WETH
    WETHPartner = fixture.WETHPartner
    WETHExchangeV1 = fixture.WETHExchangeV1
    WETHPair = fixture.WETHPair
    V2Router = fixture.router
    candyShopArber = await deployContract(
      wallet,
      CandyShopArber,
      [fixture.factoryV2.address, fixture.factoryV1.address, fixture.router.address],
      overrides
    )
    globalFixtures = fixture
  })
  it('CandyShopTokensForEth', async () => {
    // add liquidity to V1 at a rate of 1 ETH / 100 X
    console.log(formatEther(await provider.getBalance(wallet.address)))
    const WETHPartnerAmountV1 = expandTo18Decimals(100)
    const ETHAmountV1 = expandTo18Decimals(1)
    await WETHPartner.approve(WETHExchangeV1.address, WETHPartnerAmountV1)
    await WETHExchangeV1.addLiquidity(bigNumberify(1), WETHPartnerAmountV1, MaxUint256, {
      ...overrides,
      value: ETHAmountV1
    })
    // // add liquidity to V2 at a rate of 1 ETH / 200 X
    // const WETHPartnerAmountV2 = expandTo18Decimals(1000)
    // const ETHAmountV2 = expandTo18Decimals(10)
    // await WETHPartner.transfer(WETHPair.address, WETHPartnerAmountV2)
    // await WETH.deposit({value: ETHAmountV2})
    // await WETH.transfer(WETHPair.address, ETHAmountV2)
    // await WETHPair.mint(wallet.address, overrides)
    // trade 2 ETH for tokens on V1
    // bring price to 1ETH/69Tokens
    // borrow tokens on V2
    // sell for more ETH on V1
    // return ETH to V2
    // const balanceBefore = await provider.getBalance(wallet.address)
    // await candyShopArber.EthToTokenSwap(WETHPartner.address, MaxUint256, 1, 1, {
    //   ...overrides,
    //   value: expandTo18Decimals(2)
    // })
    // const balanceAfter = await provider.getBalance(wallet.address)
    // const profit = balanceAfter.sub(balanceBefore)
    // const reservesV1 = [
    //   await WETHPartner.balanceOf(WETHExchangeV1.address),
    //   await provider.getBalance(WETHExchangeV1.address),
    // ]
    // const priceV1 = reservesV1[0].div(reservesV1[1])
    // const reservesV2 = (await WETHPair.getReserves()).slice(0, 2)
    // const priceV2 =
    //   WETHPairToken0 === WETHPartner.address ? reservesV2[0].div(reservesV2[1]) : reservesV2[1].div(reservesV2[0])
    // var balanceOfCandyShop = await provider.getBalance(candyShopArber.address)
    // console.log('candy shop balance', balanceOfCandyShop.toString())
    // console.log('prices', priceV1.toString(), priceV2.toString())
  })
})

async function getAddressHoldings(fixtures: any, provider: any, weth: any, wethPartner: any, userAddress: any) {
  var ethHoldings = await provider.getBalance(userAddress)
  var wethHoldings = await fixtures.WETH.balanceOf(weth)
  var wethPartnerHoldings = await fixtures.WETHPartner.balanceOf(wethPartner)
  return [formatEther(ethHoldings), formatEther(wethHoldings), formatEther(wethPartnerHoldings)]
}
