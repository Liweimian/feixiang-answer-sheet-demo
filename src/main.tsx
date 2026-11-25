import React from 'react'
import ReactDOM from 'react-dom/client'
import { MetisConfigProvider } from '@yuanfudao/metis-web-component'
import { zhCN } from '@yuanfudao/metis-web-component/dist/locale'
import { App } from './App'
import './design-system/fx-tokens.css'
import './design-system/fx-base.css'
import './styles.css'
import './editor-workspace.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MetisConfigProvider locale={zhCN}>
      <App />
    </MetisConfigProvider>
  </React.StrictMode>,
)
