import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

describe('PaginationQueryDto', () => {
  it('applies bounded defaults', async () => {
    const query = plainToInstance(PaginationQueryDto, {});

    await expect(validate(query)).resolves.toHaveLength(0);
    expect(query).toMatchObject({ limit: 50, offset: 0 });
  });

  it('transforms numeric query strings', async () => {
    const query = plainToInstance(PaginationQueryDto, {
      limit: '25',
      offset: '10',
    });

    await expect(validate(query)).resolves.toHaveLength(0);
    expect(query).toMatchObject({ limit: 25, offset: 10 });
  });

  it('rejects limits over 100 and negative offsets', async () => {
    const query = plainToInstance(PaginationQueryDto, {
      limit: '101',
      offset: '-1',
    });

    await expect(validate(query)).resolves.toHaveLength(2);
  });
});
