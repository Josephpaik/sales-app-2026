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
import './styles.css';

dayjs.locale('ko');

export const theme = {
  token: {
    colorPrimary: '#1f3a8a',
    colorInfo: '#1f3a8a',
    borderRadius: 8,
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', system-ui, sans-serif",
  },
  components: {
    Layout: { siderBg: '#141f3f', headerBg: '#ffffff' },
    Menu: { darkItemBg: '#141f3f', darkSubMenuItemBg: '#0f172f', darkItemSelectedBg: '#1f3a8a' },
  },
};

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
