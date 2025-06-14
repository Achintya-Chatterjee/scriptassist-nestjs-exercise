import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClsService } from 'nestjs-cls';

interface ValidatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly cls: ClsService) {
    super();
  }

  handleRequest<TUser = ValidatedUser>(
    err: any,
    user: TUser,
    info: any,
    context: ExecutionContext,
  ) {
    if (user) {
      this.cls.set('user', user);
    }
    return super.handleRequest(err, user, info, context);
  }
}
