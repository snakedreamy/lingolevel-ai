import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
// 字体本地自托管：opsz 轴已按需缩放（正文字号小，自动落到低视觉字号档），
// 只需 latin 子集；wght 轴 300–800 全量保留。
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
