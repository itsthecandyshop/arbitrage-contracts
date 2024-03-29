import {BuidlerConfig, usePlugin} from '@nomiclabs/buidler/config'
usePlugin('@nomiclabs/buidler-waffle')

const config: BuidlerConfig = {
  solc: {
    version: '0.6.6',
    evmVersion: 'istanbul',
    optimizer: {
      enabled: true,
      runs: 999999
    }
  },
vyper: {
    version: "0.1.0b9"
  },
  paths: {
    artifacts: './build'
  }
}

export default config
