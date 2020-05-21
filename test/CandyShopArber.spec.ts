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
  it('CandyShop: Eth => Token swap', async () => {
    // add liquidity to V1 at a rate of 1 ETH / 200 X
    const WETHPartnerAmountV1 = expandTo18Decimals(2000)
    const ETHAmountV1 = expandTo18Decimals(10)
    await WETHPartner.approve(WETHExchangeV1.address, WETHPartnerAmountV1)
    await WETHExchangeV1.addLiquidity(bigNumberify(1), WETHPartnerAmountV1, MaxUint256, {
      ...overrides,
      value: ETHAmountV1,
    })

    // add liquidity to V2 at a rate of 1 ETH / 200 X
    const WETHPartnerAmountV2 = expandTo18Decimals(4000)
    const ETHAmountV2 = expandTo18Decimals(20)
    await WETHPartner.transfer(WETHPair.address, WETHPartnerAmountV2)
    await WETH.deposit({ value: ETHAmountV2 })
    await WETH.transfer(WETHPair.address, ETHAmountV2)
    await WETHPair.mint(wallet.address, overrides)

    const balanceBefore = await provider.getBalance(wallet.address)
    console.log('UniswapV1: 1/200 UniswapV2: 1/200')
    console.log('user holdings after everything listed below')

    console.log(
      'eth:' +
        formatEther(await provider.getBalance(wallet.address)) +
        'weth: ' +
        formatEther(await WETH.balanceOf(wallet.address)) +
        'wethPartner:' +
        formatEther(await WETHPartner.balanceOf(wallet.address))
    )

    console.log('candy shop holdings')
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
    console.log('UniswapV1: 1/' + priceV1.toString() + 'UniswapV2: 1/' + priceV2.toString())
    console.log('user holdings before everything listed below')
    console.log(
      'eth:' +
        formatEther(await provider.getBalance(wallet.address)) +
        'weth: ' +
        formatEther(await WETH.balanceOf(wallet.address)) +
        'wethPartner:' +
        formatEther(await WETHPartner.balanceOf(wallet.address))
    )
    console.log('candy shop holdings after everything')
    console.log(
      'eth:' +
        formatEther(await provider.getBalance(candyShopArber.address)) +
        'weth: ' +
        formatEther(await WETH.balanceOf(candyShopArber.address)) +
        'wethPartner:' +
        formatEther(await WETHPartner.balanceOf(candyShopArber.address))
    )
  })
  it('CandyShop: Token => ETH swap', async () => {
    // add liquidity to V1 at a rate of 1 ETH / 200 X
    const WETHPartnerAmountV1 = expandTo18Decimals(2000)
    const ETHAmountV1 = expandTo18Decimals(10)
    await WETHPartner.approve(WETHExchangeV1.address, WETHPartnerAmountV1)
    await WETHExchangeV1.addLiquidity(bigNumberify(1), WETHPartnerAmountV1, MaxUint256, {
      ...overrides,
      value: ETHAmountV1,
    })

    // add liquidity to V2 at a rate of 1 ETH / 200 X
    const WETHPartnerAmountV2 = expandTo18Decimals(4000)
    const ETHAmountV2 = expandTo18Decimals(20)
    await WETHPartner.transfer(WETHPair.address, WETHPartnerAmountV2)
    await WETH.deposit({ value: ETHAmountV2 })
    await WETH.transfer(WETHPair.address, ETHAmountV2)
    await WETHPair.mint(wallet.address, overrides)

    const balanceBefore = await provider.getBalance(wallet.address)
    console.log('UniswapV1: 1/200 UniswapV2: 1/200')
    console.log('user holdings after everything listed below')

    console.log(
      'eth:' +
        formatEther(await provider.getBalance(wallet.address)) +
        'weth: ' +
        formatEther(await WETH.balanceOf(wallet.address)) +
        'wethPartner:' +
        formatEther(await WETHPartner.balanceOf(wallet.address))
    )

    console.log('candy shop holdings')
    console.log(
      'eth:' +
        formatEther(await provider.getBalance(candyShopArber.address)) +
        'weth: ' +
        formatEther(await WETH.balanceOf(candyShopArber.address)) +
        'wethPartner:' +
        formatEther(await WETHPartner.balanceOf(candyShopArber.address))
    )

    const WETHPairToken0 = await WETHPair.token0()
    await candyShopArber.TokenToEthSwap(WETHPartner.address, expandTo18Decimals(400), MaxUint256, 1, 1, true)

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
    console.log(
      'eth:' +
        formatEther(await provider.getBalance(wallet.address)) +
        'weth: ' +
        formatEther(await WETH.balanceOf(wallet.address)) +
        'wethPartner:' +
        formatEther(await WETHPartner.balanceOf(wallet.address))
    )
    console.log('candy shop holdings after everything')
    console.log(
      'eth:' +
        formatEther(await provider.getBalance(candyShopArber.address)) +
        'weth: ' +
        formatEther(await WETH.balanceOf(candyShopArber.address)) +
        'wethPartner:' +
        formatEther(await WETHPartner.balanceOf(candyShopArber.address))
    )
  })
})

async function getAddressHoldings(fixtures: any, provider: any, weth: any, wethPartner: any, userAddress: any) {
  var ethHoldings = await provider.getBalance(userAddress)
  var wethHoldings = await fixtures.WETH.balanceOf(weth)
  var wethPartnerHoldings = await fixtures.WETHPartner.balanceOf(wethPartner)
  return [formatEther(ethHoldings), formatEther(wethHoldings), formatEther(wethPartnerHoldings)]
}
