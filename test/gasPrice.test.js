const sinon = require('sinon')
const { expect } = require('chai')
const proxyquire = require('proxyquire').noPreserveCache()
const { fetchGasPrice, gasPriceWithinLimits } = require('../src/services/gasPrice')
const { DEFAULT_UPDATE_INTERVAL } = require('../src/utils/constants')

describe('gasPrice', () => {
  describe('fetchGasPrice', () => {
    beforeEach(() => {
      sinon.stub(console, 'error')
    })
    afterEach(() => {
      console.error.restore()
    })

    it('should fetch the gas price from the oracle by default', async () => {
      // given
      const oracleFnMock = () => Promise.resolve('1')
      const bridgeContractMock = {
        methods: {
          gasPrice: {
            call: sinon.stub().returns(Promise.resolve('2'))
          }
        }
      }

      // when
      const gasPrice = await fetchGasPrice({
        bridgeContract: bridgeContractMock,
        oracleFn: oracleFnMock
      })

      // then
      expect(gasPrice).to.equal('1')
    })
    it('should fetch the gas price from the contract if the oracle fails', async () => {
      // given
      const oracleFnMock = () => Promise.reject(new Error('oracle failed'))
      const bridgeContractMock = {
        methods: {
          gasPrice: sinon.stub().returns({
            call: sinon.stub().returns(Promise.resolve('2'))
          })
        }
      }

      // when
      const gasPrice = await fetchGasPrice({
        bridgeContract: bridgeContractMock,
        oracleFn: oracleFnMock
      })

      // then
      expect(gasPrice).to.equal('2')
    })
    it('should return null if both the oracle and the contract fail', async () => {
      // given
      const oracleFnMock = () => Promise.reject(new Error('oracle failed'))
      const bridgeContractMock = {
        methods: {
          gasPrice: sinon.stub().returns({
            call: sinon.stub().returns(Promise.reject(new Error('contract failed')))
          })
        }
      }

      // when
      const gasPrice = await fetchGasPrice({
        bridgeContract: bridgeContractMock,
        oracleFn: oracleFnMock
      })

      // then
      expect(gasPrice).to.equal(null)
    })
  })
  describe('start', () => {
    const utils = { setIntervalAndRun: sinon.spy() }
    beforeEach(() => {
      utils.setIntervalAndRun.resetHistory()
    })
    it('should call setIntervalAndRun with HOME_GAS_PRICE_UPDATE_INTERVAL interval value on Home', async () => {
      // given
      process.env.HOME_GAS_PRICE_UPDATE_INTERVAL = 15000
      const gasPrice = proxyquire('../src/services/gasPrice', { '../utils/utils': utils })

      // when
      await gasPrice.start('home')

      // then
      expect(process.env.HOME_GAS_PRICE_UPDATE_INTERVAL).to.equal('15000')
      expect(process.env.HOME_GAS_PRICE_UPDATE_INTERVAL).to.not.equal(
        DEFAULT_UPDATE_INTERVAL.toString()
      )
      expect(utils.setIntervalAndRun.args[0][1]).to.equal(
        process.env.HOME_GAS_PRICE_UPDATE_INTERVAL.toString()
      )
    })
    it('should call setIntervalAndRun with FOREIGN_GAS_PRICE_UPDATE_INTERVAL interval value on Foreign', async () => {
      // given
      process.env.FOREIGN_GAS_PRICE_UPDATE_INTERVAL = 15000
      const gasPrice = proxyquire('../src/services/gasPrice', { '../utils/utils': utils })

      // when
      await gasPrice.start('foreign')

      // then
      expect(process.env.FOREIGN_GAS_PRICE_UPDATE_INTERVAL).to.equal('15000')
      expect(process.env.HOME_GAS_PRICE_UPDATE_INTERVAL).to.not.equal(
        DEFAULT_UPDATE_INTERVAL.toString()
      )
      expect(utils.setIntervalAndRun.args[0][1]).to.equal(
        process.env.FOREIGN_GAS_PRICE_UPDATE_INTERVAL.toString()
      )
    })
    it('should call setIntervalAndRun with default interval value on Home', async () => {
      // given
      delete process.env.HOME_GAS_PRICE_UPDATE_INTERVAL
      const gasPrice = proxyquire('../src/services/gasPrice', { '../utils/utils': utils })

      // when
      await gasPrice.start('home')

      // then
      expect(process.env.HOME_GAS_PRICE_UPDATE_INTERVAL).to.equal(undefined)
      expect(utils.setIntervalAndRun.args[0][1]).to.equal(DEFAULT_UPDATE_INTERVAL)
    })
    it('should call setIntervalAndRun with default interval value on Foreign', async () => {
      // given
      delete process.env.FOREIGN_GAS_PRICE_UPDATE_INTERVAL
      const gasPrice = proxyquire('../src/services/gasPrice', { '../utils/utils': utils })

      // when
      await gasPrice.start('foreign')

      // then
      expect(process.env.FOREIGN_GAS_PRICE_UPDATE_INTERVAL).to.equal(undefined)
      expect(utils.setIntervalAndRun.args[0][1]).to.equal(DEFAULT_UPDATE_INTERVAL)
    })
  })
  describe('gasPriceWithinLimits', () => {
    it('should return true if gas price is between boundaries', () => {
      // given
      const minGasPrice = 1
      const middleGasPrice = 10
      const maxGasPrice = 250

      // when
      const minGasPriceWithinLimits = gasPriceWithinLimits(minGasPrice)
      const middleGasPriceWithinLimits = gasPriceWithinLimits(middleGasPrice)
      const maxGasPriceWithinLimits = gasPriceWithinLimits(maxGasPrice)

      // then
      expect(minGasPriceWithinLimits).to.equal(true)
      expect(middleGasPriceWithinLimits).to.equal(true)
      expect(maxGasPriceWithinLimits).to.equal(true)
    })
    it('should return false if gas price is below min boundary', () => {
      // Given
      const gasPrice = 0.5

      // When
      const isGasPriceWithinLimits = gasPriceWithinLimits(gasPrice)

      // Then
      expect(isGasPriceWithinLimits).to.equal(false)
    })
    it('should return false if gas price is above max boundary', () => {
      // Given
      const gasPrice = 260

      // When
      const isGasPriceWithinLimits = gasPriceWithinLimits(gasPrice)

      // Then
      expect(isGasPriceWithinLimits).to.equal(false)
    })
  })
})
