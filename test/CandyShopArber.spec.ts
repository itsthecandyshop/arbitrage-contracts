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

    // add liquidity to V2 at a rate of 1 ETH / 100 X
    const WETHPartnerAmountV2 = expandTo18Decimals(1300)
    const ETHAmountV2 = expandTo18Decimals(10)
    await WETHPartner.transfer(WETHPair.address, WETHPartnerAmountV2)
    await WETH.deposit({ value: ETHAmountV2 })
    await WETH.transfer(WETHPair.address, ETHAmountV2)
    await WETHPair.mint(wallet.address, overrides)
    const balanceBefore = await provider.getBalance(wallet.address)
    console.log('UniswapV1: 1/100 UniswapV2: 1/130')
    console.log('user holdings after everything listed below')
    var ethHoldings1 = await provider.getBalance(wallet.address)
    var wethHoldings1 = await WETH.balanceOf(wallet.address)
    var wethPartnerHoldings1 = await WETHPartner.balanceOf(wallet.address)
    console.log(
      'eth:' +
        formatEther(await provider.getBalance(wallet.address)) +
        'weth: ' +
        formatEther(await WETH.balanceOf(wallet.address)) +
        'wethPartner:' +
        formatEther(await WETHPartner.balanceOf(wallet.address))
    )

    console.log('candy shop holdings')
    var ethHoldings = await provider.getBalance(candyShopArber.address)
    var wethHoldings = await WETH.balanceOf(candyShopArber.address)
    var wethPartnerHoldings = await WETHPartner.balanceOf(candyShopArber.address)
    console.log(
      'eth:' +
        formatEther(await provider.getBalance(candyShopArber.address)) +
        'weth: ' +
        formatEther(await WETH.balanceOf(candyShopArber.address)) +
        'wethPartner:' +
        formatEther(await WETHPartner.balanceOf(candyShopArber.address))
    )
    const WETHPairToken0 = await WETHPair.token0()
    await candyShopArber.EthToTokenSwap(WETHPartner.address, MaxUint256, 1, 1, true, {
      ...overrides,
      value: expandTo18Decimals(5),
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
    console.log('UniswapV1: 1/' + priceV1.toString() + 'UniswapV2: 1/' + priceV2.toString())
    console.log('user holdings before everything listed below')
    var ethHoldings = await provider.getBalance(wallet.address)
    var wethHoldings = await WETH.balanceOf(wallet.address)
    var wethPartnerHoldings = await WETHPartner.balanceOf(wallet.address)

    console.log(
      'eth:' +
        formatEther(await provider.getBalance(wallet.address)) +
        'weth: ' +
        formatEther(await WETH.balanceOf(wallet.address)) +
        'wethPartner:' +
        formatEther(await WETHPartner.balanceOf(wallet.address))
    )

    console.log('candy shop holdings after everything')
    var ethHoldings = await provider.getBalance(candyShopArber.address)
    var wethHoldings = await WETH.balanceOf(candyShopArber.address)
    var wethPartnerHoldings = await WETHPartner.balanceOf(candyShopArber.address)
    console.log(
      'eth:' +
        formatEther(await provider.getBalance(candyShopArber.address)) +
        'weth: ' +
        formatEther(await WETH.balanceOf(candyShopArber.address)) +
        'wethPartner:' +
        formatEther(await WETHPartner.balanceOf(candyShopArber.address))
    )
    // console.log('candy shop balance', balanceOfCandyShop.toString())
    // console.log('prices', priceV1.toString(), priceV2.toString())
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
