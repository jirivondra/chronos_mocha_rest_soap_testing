import baseConfig from '@jirivondra/chronos-test-toolkit-api-ts/eslint-config';

export default [...baseConfig, { ignores: ['allure-results/', 'allure-report/', 'schemas/generated/'] }];
