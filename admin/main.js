const apiBaseUrl = (window.__ADMIN_API_BASE_URL__ || '').replace(/\/$/, '');

const state = {
  testImageBase64: ''
};

const el = {
  menus: Array.from(document.querySelectorAll('.menu')),
  panels: {
    ai: document.getElementById('panel-ai'),
    test: document.getElementById('panel-test')
  },
  refreshBtn: document.getElementById('refreshBtn'),
  saveBtn: document.getElementById('saveBtn'),
  runTestBtn: document.getElementById('runTestBtn'),
  testConnectBtn: document.getElementById('testConnectBtn'),
  resetConfigBtn: document.getElementById('resetConfigBtn'),
  endpoint: document.getElementById('endpoint'),
  model: document.getElementById('model'),
  timeoutMs: document.getElementById('timeoutMs'),
  apiKey: document.getElementById('apiKey'),
  systemPrompt: document.getElementById('systemPrompt'),
  userPromptTemplate: document.getElementById('userPromptTemplate'),
  testImage: document.getElementById('testImage'),
  testResult: document.getElementById('testResult'),
  message: document.getElementById('message')
};

const setMessage = (text) => {
  el.message.textContent = text || '';
};

const switchMenu = (menu) => {
  el.menus.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.menu === menu);
  });
  Object.entries(el.panels).forEach(([key, panel]) => {
    panel.classList.toggle('active', key === menu);
  });
};

const fetchJson = async (path, options = {}) => {
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || '请求失败');
  }
  return data;
};

const loadConfig = async () => {
  try {
    const data = await fetchJson('/api/admin/ai/config');
    el.endpoint.value = data.external?.endpoint || '';
    el.model.value = data.external?.model || '';
    el.timeoutMs.value = String(data.external?.timeoutMs || 20000);
    el.apiKey.placeholder = data.external?.apiKeyMasked ? `当前Key: ${data.external.apiKeyMasked}` : 'API Key（留空则不修改）';
    el.apiKey.value = '';
    el.systemPrompt.value = data.external?.systemPrompt || '';
    el.userPromptTemplate.value = data.external?.userPromptTemplate || '';
    setMessage('配置读取成功');
  } catch (error) {
    setMessage(error instanceof Error ? error.message : '配置读取失败');
  }
};

const saveConfig = async () => {
  try {
    await fetchJson('/api/admin/ai/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'external_ai_api',
        external: {
          endpoint: el.endpoint.value,
          model: el.model.value,
          timeoutMs: Number(el.timeoutMs.value),
          systemPrompt: el.systemPrompt.value,
          userPromptTemplate: el.userPromptTemplate.value,
          ...(el.apiKey.value ? { apiKey: el.apiKey.value } : {})
        }
      })
    });
    setMessage('配置保存成功');
    await loadConfig();
  } catch (error) {
    setMessage(error instanceof Error ? error.message : '配置保存失败');
  }
};

const readImageAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result || '');
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });

const runTest = async () => {
  if (!state.testImageBase64) {
    setMessage('请先选择测试图片');
    return;
  }
  try {
    const data = await fetchJson('/api/admin/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'external_ai_api',
        imageBase64: state.testImageBase64
      })
    });
    el.testResult.textContent = JSON.stringify(data, null, 2);
    setMessage('识别成功');
  } catch (error) {
    setMessage(error instanceof Error ? error.message : '识别失败');
  }
};

const testConnectivity = async () => {
  setMessage('正在检测联通性...');
  try {
    const data = await fetchJson('/api/admin/ai/config');
    const endpoint = data.external?.endpoint || '';
    const model = data.external?.model || '';
    if (!endpoint) {
      setMessage('错误: API 接口地址未配置');
      return;
    }
    const isAliyun = endpoint.includes('dashscope.aliyuncs.com');
    const testUrl = isAliyun ? endpoint : `${endpoint}/chat/completions`;
    const testPayload = isAliyun
      ? { model: model || 'qwen-vl-plus', input: { messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }] } }
      : { model: model || 'gpt-3.5-turbo', messages: [{ role: 'user', content: 'Hello' }], max_tokens: 5 };
    const startTime = Date.now();
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(data.external?.apiKeyMasked ? { 'Authorization': `Bearer ${el.apiKey.value || 'use-saved-key'}` } : {})
      },
      body: JSON.stringify(testPayload)
    });
    const elapsed = Date.now() - startTime;
    if (response.ok) {
      setMessage(`联通性检测成功 (${elapsed}ms) - API 可正常访问`);
    } else {
      const errorText = await response.text();
      setMessage(`联通性检测失败 (${response.status}): ${errorText.slice(0, 100)}`);
    }
  } catch (error) {
    setMessage(`联通性检测失败: ${error instanceof Error ? error.message : '网络错误'}`);
  }
};

const resetConfig = async () => {
  if (!confirm('确定要重置 API 配置吗？这将清除所有已保存的配置。')) {
    return;
  }
  try {
    await fetchJson('/api/admin/ai/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'external_ai_api',
        external: {
          endpoint: '',
          model: '',
          timeoutMs: 20000,
          systemPrompt: '',
          userPromptTemplate: '',
          apiKey: ''
        }
      })
    });
    setMessage('配置已重置');
    await loadConfig();
  } catch (error) {
    setMessage(error instanceof Error ? error.message : '重置失败');
  }
};

el.menus.forEach((btn) => {
  btn.addEventListener('click', () => switchMenu(btn.dataset.menu));
});
el.refreshBtn.addEventListener('click', loadConfig);
el.saveBtn.addEventListener('click', saveConfig);
el.runTestBtn.addEventListener('click', runTest);
el.testConnectBtn.addEventListener('click', testConnectivity);
el.resetConfigBtn.addEventListener('click', resetConfig);
el.testImage.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    state.testImageBase64 = await readImageAsBase64(file);
    setMessage('测试图片已加载');
  } catch (error) {
    setMessage(error instanceof Error ? error.message : '图片读取失败');
  }
});

switchMenu('ai');
loadConfig();
