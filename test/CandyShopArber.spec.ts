import chai, { expect } from 'chai'
import { MaxUint256 } from 'ethers/constants'
import { BigNumber, bigNumberify, defaultAbiCoder, formatEther } from 'ethers/utils'
import { solidity, MockProvider, createFixtureLoader, deployContract } from 'ethereum-waffle'
import { expandTo18Decimals } from './shared/utilities'
import { v2Fixture } from './shared/fixtures'
import CandyShopArber from '../build/CandyShopArber.json'
import { Contract } from 'ethers'

chai.use(solidity)

const overrides = {
  gasLimit: 9999999,
  gasPrice: 0,
}

describe('CandyShopArber', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999,
  })

  const [wallet] = provider.getWallets()
  const loadFixture = createFixtureLoader(provider, [wallet])
  let globalFixtures: any
  let WETH: Contract
  let WETHPartner: Contract
  let WETHExchangeV1: Contract
  let WETHPair: Contract
  let candyShopArber: Contract
  let V2Router: Contract
  beforeEach(async function () {
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
    const WETHPartnerAmountV1 = expandTo18Decimals(1000)
    const ETHAmountV1 = expandTo18Decimals(10)
    await WETHPartner.approve(WETHExchangeV1.address, WETHPartnerAmountV1)
    await WETHExchangeV1.addLiquidity(bigNumberify(1), WETHPartnerAmountV1, MaxUint256, {
      ...overrides,
      value: ETHAmountV1,
    })

    // add liquidity to V2 at a rate of 1 ETH / 200 X
    const WETHPartnerAmountV2 = expandTo18Decimals(1300)
    const ETHAmountV2 = expandTo18Decimals(10)
    await WETHPartner.transfer(WETHPair.address, WETHPartnerAmountV2)
    await WETH.deposit({ value: ETHAmountV2 })
    await WETH.transfer(WETHPair.address, ETHAmountV2)
    await WETHPair.mint(wallet.address, overrides)

    // trade 2 ETH for tokens on V1
    // bring price to 1ETH/69Tokens
    // borrow tokens on V2
    // sell for more ETH on V1
    // return ETH to V2

    const balanceBefore = await provider.getBalance(wallet.address)

    // now, execute arbitrage via uniswapV2Call:
    // receive 200 X from V2, get as much ETH from V1 as we can, repay V2 with minimum ETH, keep the rest!
    const arbitrageAmount = expandTo18Decimals(200)
    // instead of being 'hard-coded', the above value could be calculated optimally off-chain. this would be
    // better, but it'd be better yet to calculate the amount at runtime, on-chain. unfortunately, this requires a
    // swap-to-price calculation, which is a little tricky, and out of scope for the moment
    const WETHPairToken0 = await WETHPair.token0()
    const amount0 = WETHPairToken0 === WETHPartner.address ? arbitrageAmount : bigNumberify(0)
    const amount1 = WETHPairToken0 === WETHPartner.address ? bigNumberify(0) : arbitrageAmount
    await candyShopArber.EthToTokenSwap(WETHPartner.address, amount0, amount1, MaxUint256, 1, 1, {
      ...overrides,
      value: expandTo18Decimals(1),
    })

    const balanceAfter = await provider.getBalance(wallet.address)
    const profit = balanceAfter.sub(balanceBefore)
    const reservesV1 = [
      await WETHPartner.balanceOf(WETHExchangeV1.address),
      await provider.getBalance(WETHExchangeV1.address),
    ]
    const priceV1 = reservesV1[0].div(reservesV1[1])
    const reservesV2 = (await WETHPair.getReserves()).slice(0, 2)
    const priceV2 =
      WETHPairToken0 === WETHPartner.address ? reservesV2[0].div(reservesV2[1]) : reservesV2[1].div(reservesV2[0])

    var balanceOfCandyShop = await provider.getBalance(candyShopArber.address)
    console.log('candy shop balance', balanceOfCandyShop.toString())
    console.log('prices', priceV1.toString(), priceV2.toString())
    // expect(formatEther(profit)).to.eq('0.548043441089763649') // our profit is ~.5 ETH
    // expect(priceV1.toString()).to.eq('143') // we pushed the v1 price up to ~143
    // expect(priceV2.toString()).to.eq('161') // we pushed the v2 price down to ~161
    // await WETHPair.swap(
    //   amount0,
    //   amount1,
    //   candyShopArber.address,
    //   defaultAbiCoder.encode(['uint'], [bigNumberify(1)]),
    //   overrides
    // )
  })
})

async function getAddressHoldings(fixtures: any, provider: any, weth: any, wethPartner: any, userAddress: any) {
  var ethHoldings = await provider.getBalance(userAddress)
  var wethHoldings = await fixtures.WETH.balanceOf(weth)
  var wethPartnerHoldings = await fixtures.WETHPartner.balanceOf(wethPartner)
  return [formatEther(ethHoldings), formatEther(wethHoldings), formatEther(wethPartnerHoldings)]
}
