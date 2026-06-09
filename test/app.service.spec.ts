import { AppService } from '../src/app.service';

describe('AppService', () => {
  it('returns the bootstrap message', () => {
    const service = new AppService();

    expect(service.getRootMessage()).toEqual({
      message: 'Restaurat API base initialized',
    });
  });
});
