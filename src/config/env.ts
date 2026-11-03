export const env = {
  baseURL: process.env.BASE_URL ?? 'https://opensource-demo.orangehrmlive.com',
  username: process.env.ORANGEHRM_USERNAME ?? 'Admin',
  password: process.env.ORANGEHRM_PASSWORD ?? 'admin123',
} as const;
