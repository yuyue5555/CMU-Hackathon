// 配置文件 - 从 .env 导入的 API Keys
// 警告：此文件包含敏感信息，不要提交到 Git 仓库

const CONFIG = {
  // OpenAI API 配置
  OPENAI_API_KEY: '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',
  
  // Hugging Face API 配置
  HF_TOKEN: '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',
  
  // 默认使用的 AI 服务
  DEFAULT_AI_SERVICE: 'openai', // 'openai' 或 'huggingface'
  
  // OpenAI 模型配置
  OPENAI_MODEL: 'gpt-3.5-turbo',
  OPENAI_MAX_TOKENS: 1000,
  OPENAI_TEMPERATURE: 0.7,
  
  // Hugging Face 模型配置
  HF_MODEL: 'facebook/bart-large-cnn',
};
