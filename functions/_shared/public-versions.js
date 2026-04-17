export const PUBLIC_CONTENT_VERSIONS = Object.freeze({
  app_config_version: 'local-static-app-config-v1',
  azkar_version: 'local-static-azkar-v1',
  duas_version: 'local-static-duas-v1',
  stories_version: 'local-static-stories-v1',
  daily_content_version: 'local-static-daily-content-v1'
});

export const PUBLIC_CONTENT_SECTIONS = Object.freeze([
  Object.freeze({ id: 'app_config', endpoint: '/api/public/content/app-config', versionKey: 'app_config_version' }),
  Object.freeze({ id: 'azkar', endpoint: '/api/public/content/azkar', versionKey: 'azkar_version' }),
  Object.freeze({ id: 'duas', endpoint: '/api/public/content/duas', versionKey: 'duas_version' }),
  Object.freeze({ id: 'stories', endpoint: '/api/public/content/stories', versionKey: 'stories_version' }),
  Object.freeze({ id: 'daily_content', endpoint: '/api/public/content/daily-content', versionKey: 'daily_content_version' })
]);
