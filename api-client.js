// AI API 客户端 - 支持 OpenAI 和 Hugging Face

/**
 * 调用 OpenAI API 进行文本转换
 * @param {string} text - 要转换的文本
 * @param {string} apiKey - OpenAI API Key
 * @param {string} systemPrompt - 系统提示词
 * @returns {Promise<Object>} 转换结果
 */
async function callOpenAI(text, apiKey, systemPrompt) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: CONFIG.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: CONFIG.OPENAI_MAX_TOKENS || 1000,
        temperature: CONFIG.OPENAI_TEMPERATURE || 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API 错误: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      transformedText: data.choices[0].message.content.trim(),
      usage: data.usage,
      model: data.model,
      service: 'openai'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      service: 'openai'
    };
  }
}

/**
 * 调用 Hugging Face API 进行文本转换
 * @param {string} text - 要转换的文本
 * @param {string} token - HF Token
 * @param {string} model - 模型名称
 * @returns {Promise<Object>} 转换结果
 */
async function callHuggingFace(text, token, model = 'facebook/bart-large-cnn') {
  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            max_length: 150,
            min_length: 30,
            do_sample: false
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API 错误: ${response.status}`);
    }

    const data = await response.json();
    
    // Hugging Face 返回格式可能不同，需要适配
    let transformedText = '';
    if (Array.isArray(data) && data[0]) {
      transformedText = data[0].summary_text || data[0].generated_text || text;
    } else if (data.generated_text) {
      transformedText = data.generated_text;
    } else {
      transformedText = text;
    }

    return {
      success: true,
      transformedText: transformedText.trim(),
      model: model,
      service: 'huggingface'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      service: 'huggingface'
    };
  }
}

/**
 * 获取系统提示词
 * @param {string} promptKey - 提示词键名
 * @returns {string} 系统提示词
 */
function getSystemPrompt(promptKey = 'WORD_REPLACER') {
  const SYSTEM_PROMPTS = {
    DEFAULT: `你是一个专业的内容审核和沟通专家。你的主要职责是将有毒、冒犯或不当的评论转换为文明、尊重的文本，同时传达相同的潜在含义或情感。

转换指南：
- 删除所有脏话、侮辱和冒犯性语言
- 保持原始意图或情感
- 使用尊重、专业的语言
- 在使其具有建设性的同时保留核心信息
- 如果原始消息纯粹是仇恨而没有建设性意图，将其转换为中立、尊重的陈述
- 绝不添加煽动性内容或升级情况
- 专注于促进健康、建设性的沟通
- 重要：只返回转换后的文本，不要有任何解释或额外评论`,

    WORD_REPLACER: `你是一个积极语言助手。你的职责是用积极的替代词替换负面词汇，同时保持句子结构和含义。

指南：
- 用积极的替代词替换负面/有毒词汇
- 保持句子结构完整
- 尽可能保持整体含义
- 只替换负面词汇，不要重写整个句子
- 只返回转换后的文本，不要有任何解释
- 如果一个词在上下文中有积极含义，不要改变它`,

    AGGRESSIVE_TRANSFORMER: `你是一个专注于缓和激进沟通的冲突解决专家。将敌对、对抗或激进的评论转换为冷静、外交的语言。

你的方法：
- 将激进的语言转换为坚定但尊重的陈述
- 用建设性的关注替换威胁或恐吓
- 将人身攻击转换为客观观察
- 在促进文明的同时维护人们表达不同意见的权利
- 使用"我"陈述而不是指责性的"你"陈述
- 关注问题而不是个人特征
- 只返回转换后的文本，不要有解释`,

    HATE_SPEECH_TRANSFORMER: `你是一个专门将仇恨言论和歧视性语言转换为包容、尊重沟通的专家。你的职责是中和有害内容，同时保留任何合法的潜在关注。

转换原则：
- 删除所有歧视性语言、侮辱和仇恨言论
- 将带有偏见的陈述转换为客观观察
- 用具体、建设性的反馈替换对群体的概括
- 将排他性语言转换为包容性替代方案
- 关注行为或政策而不是身份
- 促进理解和建立桥梁而不是分裂
- 只返回转换后的文本，不要有解释`
  };

  return SYSTEM_PROMPTS[promptKey] || SYSTEM_PROMPTS.WORD_REPLACER;
}

/**
 * 智能 AI 调用 - 根据配置选择服务
 * @param {string} text - 要转换的文本
 * @param {string} service - 服务类型 ('openai' 或 'huggingface')
 * @param {string} promptKey - 提示词键名（仅用于 OpenAI）
 * @returns {Promise<Object>} 转换结果
 */
async function transformText(text, service = null, promptKey = 'WORD_REPLACER') {
  // 使用指定服务或默认服务
  const selectedService = service || CONFIG.DEFAULT_AI_SERVICE || 'openai';
  
  if (selectedService === 'openai') {
    const systemPrompt = getSystemPrompt(promptKey);
    return await callOpenAI(text, CONFIG.OPENAI_API_KEY, systemPrompt);
  } else if (selectedService === 'huggingface') {
    return await callHuggingFace(text, CONFIG.HF_TOKEN, CONFIG.HF_MODEL);
  } else {
    return {
      success: false,
      error: '未知的 AI 服务类型'
    };
  }
}
