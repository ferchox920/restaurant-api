import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRootMessage(): { message: string } {
    return { message: 'Restaurat API base initialized' };
  }
}
