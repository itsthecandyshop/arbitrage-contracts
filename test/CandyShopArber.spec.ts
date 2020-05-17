import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { MaxUint256 } from 'ethers/constants'
import { BigNumber, bigNumberify, defaultAbiCoder, formatEther } from 'ethers/utils'
import { solidity, MockProvider, createFixtureLoader, deployContract } from 'ethereum-waffle'
import { expandTo18Decimals } from './shared/utilities'
import { v2Fixture } from './shared/fixtures'
import CandyShopArber from '../build/CandyShopArber.json'

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
  })
  it('EthToTokenSwapInputV1Vanilla', async () => {
    // add liquidity to V1 at a rate of 1 ETH / 100 X
    const WETHPartnerAmountV1 = expandTo18Decimals(1000)
    const ETHAmountV1 = expandTo18Decimals(10)
    await WETHPartner.approve(WETHExchangeV1.address, WETHPartnerAmountV1)
    await WETHExchangeV1.addLiquidity(bigNumberify(1), WETHPartnerAmountV1, MaxUint256, {
      ...overrides,
      value: ETHAmountV1,
    })

    const balanceBefore = await provider.getBalance(wallet.address)
    console.log('CANDYSHOP: ETH holdings of original swapper', balanceBefore.toString())
    var tokenBalanceBefore = await WETHPartner.balanceOf(wallet.address)
    console.log('CANDYSHOP: TOKEN holdings of original swapper', tokenBalanceBefore.toString())

    await candyShopArber.EthToTokenSwapInputV1Vanilla(WETHPartner.address, expandTo18Decimals(1), MaxUint256, {
      ...overrides,
      value: expandTo18Decimals(1),
    })

    const balanceAfter = await provider.getBalance(wallet.address)
    console.log('CANDYSHOP: ETH holdings of original swapper', balanceAfter.toString())
    console.log('CANDYSHOP: ETH loss', balanceBefore.sub(balanceAfter).toString())
    var tokenBalanceBefore = await WETHPartner.balanceOf(wallet.address)
    console.log('CANDYSHOP: TOKEN holdings of original swapper', tokenBalanceBefore.toString())
  })

  it('ExactETHForTokensV2', async () => {
    // add liquidity to V2 at a rate of 1 ETH / 200 X
    const WETHPartnerAmountV2 = expandTo18Decimals(2000)
    const ETHAmountV2 = expandTo18Decimals(10)
    await WETHPartner.transfer(WETHPair.address, WETHPartnerAmountV2)
    await WETH.deposit({ value: ETHAmountV2 })
    await WETH.transfer(WETHPair.address, ETHAmountV2)
    await WETHPair.mint(wallet.address, overrides)

    const balanceBefore = await provider.getBalance(wallet.address)
    console.log('CANDYSHOP: ETH holdings of original swapper', formatEther(balanceBefore))
    var wethBalanceBefore = await WETH.balanceOf(wallet.address)
    console.log('CANDYSHOP: WETH TOKEN holdings of original swapper', formatEther(wethBalanceBefore))
    var tokenBalanceBefore = await WETHPartner.balanceOf(wallet.address)
    console.log('CANDYSHOP: TOKEN holdings of original swapper', formatEther(tokenBalanceBefore))
    var swapAmount = expandTo18Decimals(1)

    // I want to swap 1ETH and get 200 tokens from V2
    await candyShopArber.ExactETHForTokensV2(0, [WETH.address, WETHPartner.address], wallet.address, MaxUint256, {
      ...overrides,
      value: swapAmount,
    })

    const balanceAfter = await provider.getBalance(wallet.address)
    console.log('CANDYSHOP: ETH holdings of original swapper', formatEther(balanceAfter))
    var wethBalanceAfter = await WETH.balanceOf(wallet.address)
    console.log('CANDYSHOP: WETH TOKEN holdings of original swapper', formatEther(wethBalanceAfter))
    const tokenBalanceAfter = await WETHPartner.balanceOf(wallet.address)
    console.log('CANDYSHOP: TOKEN holdings of original swapper', formatEther(tokenBalanceAfter))
    console.log('profit', balanceBefore.sub(balanceAfter).toString())
  })

  it('ExactETHForTokensV2', async () => {
    // add liquidity to V2 at a rate of 1 ETH / 200 X
    const WETHPartnerAmountV2 = expandTo18Decimals(2000)
    const ETHAmountV2 = expandTo18Decimals(10)
    await WETHPartner.transfer(WETHPair.address, WETHPartnerAmountV2)
    await WETH.deposit({ value: ETHAmountV2 })
    await WETH.transfer(WETHPair.address, ETHAmountV2)
    await WETHPair.mint(wallet.address, overrides)

    const balanceBefore = await provider.getBalance(wallet.address)
    console.log('CANDYSHOP: ETH holdings of original swapper', formatEther(balanceBefore))
    var wethBalanceBefore = await WETH.balanceOf(wallet.address)
    console.log('CANDYSHOP: WETH TOKEN holdings of original swapper', formatEther(wethBalanceBefore))
    var tokenBalanceBefore = await WETHPartner.balanceOf(wallet.address)
    console.log('CANDYSHOP: TOKEN holdings of original swapper', formatEther(tokenBalanceBefore))
    var swapAmount = expandTo18Decimals(1)

    // I want to swap 1ETH and get 200 tokens from V2
    await candyShopArber.ExactETHForTokensV2(0, [WETH.address, WETHPartner.address], wallet.address, MaxUint256, {
      ...overrides,
      value: swapAmount,
    })

    const balanceAfter = await provider.getBalance(wallet.address)
    console.log('CANDYSHOP: ETH holdings of original swapper', formatEther(balanceAfter))
    var wethBalanceAfter = await WETH.balanceOf(wallet.address)
    console.log('CANDYSHOP: WETH TOKEN holdings of original swapper', formatEther(wethBalanceAfter))
    const tokenBalanceAfter = await WETHPartner.balanceOf(wallet.address)
    console.log('CANDYSHOP: TOKEN holdings of original swapper', formatEther(tokenBalanceAfter))
    console.log('profit', balanceBefore.sub(balanceAfter).toString())
  })
  it('EthToTokenSwapInputV1', async () => {
    // add liquidity to V1 at a rate of 1 ETH / 100 X
    const WETHPartnerAmountV1 = expandTo18Decimals(1000)
    const ETHAmountV1 = expandTo18Decimals(10)
    await WETHPartner.approve(WETHExchangeV1.address, WETHPartnerAmountV1)
    await WETHExchangeV1.addLiquidity(bigNumberify(1), WETHPartnerAmountV1, MaxUint256, {
      ...overrides,
      value: ETHAmountV1,
    })

    // add liquidity to V2 at a rate of 1 ETH / 200 X
    const WETHPartnerAmountV2 = expandTo18Decimals(2000)
    const ETHAmountV2 = expandTo18Decimals(10)
    await WETHPartner.transfer(WETHPair.address, WETHPartnerAmountV2)
    await WETH.deposit({ value: ETHAmountV2 })
    await WETH.transfer(WETHPair.address, ETHAmountV2)
    await WETHPair.mint(wallet.address, overrides)

    // const balanceBefore = await provider.getBalance(wallet.address)
    // console.log('CANDYSHOP: ETH holdings of original swapper', balanceBefore.toString())
    // const candyShopBalanceBeore = await provider.getBalance(candyShopArber.address)
    // console.log('CANDYSHOP: ETH holdings before arbitrage:', candyShopBalanceBeore.toString())

    // TODO replace with either on-chain function or off-chain function
    // now, execute arbitrage via uniswapV2Call:
    // receive 200 X from V2, get as much ETH from V1 as we can, repay V2 with minimum ETH, keep the rest!
    const arbitrageAmount = expandTo18Decimals(200)
    // instead of being 'hard-coded', the above value could be calculated optimally off-chain. this would be
    // better, but it'd be better yet to calculate the amount at runtime, on-chain. unfortunately, this requires a
    // swap-to-price calculation, which is a little tricky, and out of scope for the moment

    const WETHPairToken0 = await WETHPair.token0()
    const amount0 = WETHPairToken0 === WETHPartner.address ? arbitrageAmount : bigNumberify(0)
    const amount1 = WETHPairToken0 === WETHPartner.address ? bigNumberify(0) : arbitrageAmount
    // console.log('weth partner', WETHPartner.address)
    var result = await candyShopArber.EthToTokenSwapInputV1Vanilla(
      WETHPartner.address,
      expandTo18Decimals(1),
      MaxUint256,
      {
        ...overrides,
        value: expandTo18Decimals(1),
      }
    )
    // console.log('result', result)
    // 0 1000000000000000000 0x8B79F9D5318f74bC8F84eE9B0cc2A077a382d63C 0x0000000000000000000000000000000000000000000000000000000000000001

    // const balanceAfter = await provider.getBalance(wallet.address)
    // console.log('CANDYSHOP: ETH holdings of original swapper', balanceAfter.toString())

    // const candyShopBalanceAfter = await provider.getBalance(candyShopArber.address)
    // console.log('CANDYSHOP: ETH holdings after arbitrage:', candyShopBalanceAfter.toString())

    // const profit = balanceAfter.sub(balanceBefore)
    // const reservesV1 = [
    //   await WETHPartner.balanceOf(WETHExchangeV1.address),
    //   await provider.getBalance(WETHExchangeV1.address),
    // ]
    // const priceV1 = reservesV1[0].div(reservesV1[1])
    // const reservesV2 = (await WETHPair.getReserves()).slice(0, 2)
    // const priceV2 =
    //   WETHPairToken0 === WETHPartner.address ? reservesV2[0].div(reservesV2[1]) : reservesV2[1].div(reservesV2[0])

    // expect(formatEther(profit)).to.eq('0.548043441089763649') // our profit is ~.5 ETH
    // expect(priceV1.toString()).to.eq('143') // we pushed the v1 price up to ~143
    // expect(priceV2.toString()).to.eq('161') // we pushed the v2 price down to ~161
  })
})
