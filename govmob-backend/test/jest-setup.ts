jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-v4'),
  v7: jest.fn(() => '018f0000-0000-7000-8000-000000000000'), // uuidv7 mock
}));
