import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import koKR from 'antd/locale/ko_KR';
import { ConfigProvider as MobileConfigProvider } from 'antd-mobile';
import koKRMobile from 'antd-mobile/es/locales/ko-KR';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import App from './App';
import { theme } from './theme';
import './styles.css';

dayjs.locale('ko');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={koKR} theme={theme}>
      <MobileConfigProvider locale={koKRMobile}>
        <AntApp>
          <HashRouter>
            <App />
          </HashRouter>
        </AntApp>
      </MobileConfigProvider>
    </ConfigProvider>
  </React.StrictMode>,
);
